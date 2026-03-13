import "server-only";

const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";

const LINEAR_API_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "slack-mcp-client",
} as const;

type LinearGraphQLError = {
  message: string;
};

type LinearGraphQLResponse<T> = {
  data?: T;
  errors?: LinearGraphQLError[];
};

type LinearViewerQueryResponse = {
  teams: {
    nodes: Array<{
      id: string;
      key: string;
      name: string;
    }>;
  };
  viewer: {
    email: string | null;
    id: string;
    name: string | null;
  };
};

export type LinearApiKeyValidationResult = {
  linearApiKeyExpiresAt: string | null;
  linearApiKeyLastValidatedAt: string;
  linearTeamId: string;
  linearTeamKey: string;
  linearTeamName: string;
  linearUserId: string;
  linearUserName: string;
};

const VALIDATE_LINEAR_API_KEY_QUERY = `
  query ValidateLinearApiKey {
    viewer {
      id
      name
      email
    }
    teams(first: 250) {
      nodes {
        id
        key
        name
      }
    }
  }
`;

async function linearGraphQLRequest<T>({
  linearApiKey,
  query,
}: {
  linearApiKey: string;
  query: string;
}) {
  const response = await fetch(LINEAR_GRAPHQL_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      ...LINEAR_API_HEADERS,
      Authorization: linearApiKey,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Linear API key validation failed with HTTP ${response.status}`);
  }

  const payload =
    (await response.json()) as LinearGraphQLResponse<T>;

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? "Linear API key validation failed.");
  }

  if (!payload.data) {
    throw new Error("Linear API key validation failed.");
  }

  return payload.data;
}

function formatAccessibleTeams(teams: Array<{ key: string; name: string }>) {
  if (teams.length === 0) {
    return "none";
  }

  return teams
    .slice(0, 10)
    .map((team) => `${team.key} (${team.name})`)
    .join(", ");
}

export async function validateLinearApiKey({
  linearApiKey,
}: {
  linearApiKey: string;
}): Promise<LinearApiKeyValidationResult> {
  const normalizedApiKey = linearApiKey.trim();

  if (!normalizedApiKey) {
    throw new Error("Linear API key is required");
  }

  const data = await linearGraphQLRequest<LinearViewerQueryResponse>({
    linearApiKey: normalizedApiKey,
    query: VALIDATE_LINEAR_API_KEY_QUERY,
  });

  if (data.teams.nodes.length === 0) {
    throw new Error(
      "Linear API key does not have access to any teams. Create a team-scoped member API key and try again."
    );
  }

  if (data.teams.nodes.length > 1) {
    throw new Error(
      `Linear API key can access multiple teams. Create a key limited to a single team and try again. Accessible teams: ${formatAccessibleTeams(
        data.teams.nodes
      )}.`
    );
  }

  const matchedTeam = data.teams.nodes[0];

  return {
    // Linear's public docs do not expose personal API key expiry via GraphQL.
    linearApiKeyExpiresAt: null,
    linearApiKeyLastValidatedAt: new Date().toISOString(),
    linearTeamId: matchedTeam.id,
    linearTeamKey: matchedTeam.key,
    linearTeamName: matchedTeam.name,
    linearUserId: data.viewer.id,
    linearUserName: data.viewer.name ?? data.viewer.email ?? data.viewer.id,
  };
}
