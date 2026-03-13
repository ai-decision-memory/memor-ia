import "server-only";
import { jsonSchema, tool } from "ai";

type GitHubPATContext = {
  githubOrgLogin: string;
  githubPersonalAccessToken: string;
  githubUserLogin: string;
};

type GitHubOrgRepository = {
  default_branch: string | null;
  description: string | null;
  full_name: string;
  html_url: string;
  name: string;
  private: boolean;
  updated_at: string;
};

type GitHubTeam = {
  description: string | null;
  html_url: string;
  name: string;
  privacy: string;
  repositories_url: string;
  slug: string;
};

type GitHubUser = {
  html_url: string;
  id: number;
  login: string;
};

type GitHubDeployment = {
  created_at: string;
  creator: {
    login: string;
  } | null;
  environment: string | null;
  id: number;
  original_environment: string | null;
  ref: string;
  sha: string;
  statuses_url: string;
  updated_at: string;
};

type GitHubListPaginationInput = {
  page?: number;
  perPage?: number;
};

type GitHubGetTeamMembersInput = GitHubListPaginationInput & {
  teamSlug: string;
};

type GitHubListRepositoriesInput = GitHubListPaginationInput & {
  query?: string;
};

type GitHubListRepositoryDeploymentsInput = GitHubListPaginationInput & {
  environment?: string;
  repo: string;
};

const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "slack-mcp-client",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

async function fetchGitHubFromOrganization<T>({
  githubOrgLogin,
  githubPersonalAccessToken,
  pathname,
  searchParams,
}: {
  githubOrgLogin: string;
  githubPersonalAccessToken: string;
  pathname: string;
  searchParams?: Record<string, string>;
}) {
  const url = new URL(pathname, "https://api.github.com");

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      ...GITHUB_API_HEADERS,
      Authorization: `Bearer ${githubPersonalAccessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub request failed for ${githubOrgLogin} with ${response.status}`
    );
  }

  return (await response.json()) as T;
}

export function createGitHubOrgTools({
  githubOrgLogin,
  githubPersonalAccessToken,
  githubUserLogin,
}: GitHubPATContext) {
  return {
    github_get_connected_organization: tool({
      description:
        "Return the connected GitHub organization and the GitHub user tied to the current PAT.",
      inputSchema: jsonSchema<Record<string, never>>({
        additionalProperties: false,
        properties: {},
        type: "object",
      }),
      execute: async () => ({
        organizationLogin: githubOrgLogin,
        userLogin: githubUserLogin,
      }),
    }),
    github_get_team_members: tool({
      description:
        "List members of a specific team in the connected GitHub organization.",
      inputSchema: jsonSchema<GitHubGetTeamMembersInput>({
        additionalProperties: false,
        properties: {
          page: {
            minimum: 1,
            type: "number",
          },
          perPage: {
            maximum: 100,
            minimum: 1,
            type: "number",
          },
          teamSlug: {
            description: "The team slug in the connected GitHub organization.",
            minLength: 1,
            type: "string",
          },
        },
        required: ["teamSlug"],
        type: "object",
      }),
      execute: async ({ page = 1, perPage = 30, teamSlug }) => {
        const members = await fetchGitHubFromOrganization<GitHubUser[]>({
          githubOrgLogin,
          githubPersonalAccessToken,
          pathname: `/orgs/${encodeURIComponent(
            githubOrgLogin
          )}/teams/${encodeURIComponent(teamSlug)}/members`,
          searchParams: {
            page: String(page),
            per_page: String(perPage),
          },
        });

        return {
          members: members.map((member) => ({
            htmlUrl: member.html_url,
            id: member.id,
            login: member.login,
          })),
          organizationLogin: githubOrgLogin,
          teamSlug,
        };
      },
    }),
    github_list_org_repositories: tool({
      description:
        "List repositories in the connected GitHub organization. Use this instead of generic repository search.",
      inputSchema: jsonSchema<GitHubListRepositoriesInput>({
        additionalProperties: false,
        properties: {
          page: {
            minimum: 1,
            type: "number",
          },
          perPage: {
            maximum: 100,
            minimum: 1,
            type: "number",
          },
          query: {
            description:
              "Optional case-insensitive text to filter by repository name, full name, or description.",
            type: "string",
          },
        },
        type: "object",
      }),
      execute: async ({ page = 1, perPage = 100, query }) => {
        const repositories = await fetchGitHubFromOrganization<GitHubOrgRepository[]>(
          {
            githubOrgLogin,
            githubPersonalAccessToken,
            pathname: `/orgs/${encodeURIComponent(githubOrgLogin)}/repos`,
            searchParams: {
              page: String(page),
              per_page: String(perPage),
              sort: "updated",
              type: "all",
            },
          }
        );

        const normalizedQuery = query?.trim().toLowerCase();
        const filteredRepositories = normalizedQuery
          ? repositories.filter((repository) => {
              const haystacks = [
                repository.name,
                repository.full_name,
                repository.description ?? "",
              ];

              return haystacks.some((value) =>
                value.toLowerCase().includes(normalizedQuery)
              );
            })
          : repositories;

        return {
          organizationLogin: githubOrgLogin,
          repositories: filteredRepositories.map((repository) => ({
            defaultBranch: repository.default_branch,
            description: repository.description,
            fullName: repository.full_name,
            htmlUrl: repository.html_url,
            name: repository.name,
            private: repository.private,
            updatedAt: repository.updated_at,
          })),
        };
      },
    }),
    github_list_org_teams: tool({
      description: "List teams in the connected GitHub organization.",
      inputSchema: jsonSchema<GitHubListPaginationInput>({
        additionalProperties: false,
        properties: {
          page: {
            minimum: 1,
            type: "number",
          },
          perPage: {
            maximum: 100,
            minimum: 1,
            type: "number",
          },
        },
        type: "object",
      }),
      execute: async ({ page = 1, perPage = 30 }) => {
        const teams = await fetchGitHubFromOrganization<GitHubTeam[]>({
          githubOrgLogin,
          githubPersonalAccessToken,
          pathname: `/orgs/${encodeURIComponent(githubOrgLogin)}/teams`,
          searchParams: {
            page: String(page),
            per_page: String(perPage),
          },
        });

        return {
          organizationLogin: githubOrgLogin,
          teams: teams.map((team) => ({
            description: team.description,
            htmlUrl: team.html_url,
            name: team.name,
            privacy: team.privacy,
            repositoriesUrl: team.repositories_url,
            slug: team.slug,
          })),
        };
      },
    }),
    github_list_repository_deployments: tool({
      description:
        "List deployments for a repository in the connected GitHub organization.",
      inputSchema: jsonSchema<GitHubListRepositoryDeploymentsInput>({
        additionalProperties: false,
        properties: {
          environment: {
            type: "string",
          },
          page: {
            minimum: 1,
            type: "number",
          },
          perPage: {
            maximum: 100,
            minimum: 1,
            type: "number",
          },
          repo: {
            description:
              "The repository name inside the connected GitHub organization.",
            minLength: 1,
            type: "string",
          },
        },
        required: ["repo"],
        type: "object",
      }),
      execute: async ({ environment, page = 1, perPage = 30, repo }) => {
        const deployments = await fetchGitHubFromOrganization<GitHubDeployment[]>(
          {
            githubOrgLogin,
            githubPersonalAccessToken,
            pathname: `/repos/${encodeURIComponent(
              githubOrgLogin
            )}/${encodeURIComponent(repo)}/deployments`,
            searchParams: {
              ...(environment ? { environment } : {}),
              page: String(page),
              per_page: String(perPage),
            },
          }
        );

        return {
          deployments: deployments.map((deployment) => ({
            createdAt: deployment.created_at,
            creatorLogin: deployment.creator?.login ?? null,
            environment: deployment.environment,
            id: deployment.id,
            originalEnvironment: deployment.original_environment,
            ref: deployment.ref,
            sha: deployment.sha,
            statusesUrl: deployment.statuses_url,
            updatedAt: deployment.updated_at,
          })),
          organizationLogin: githubOrgLogin,
          repository: repo,
        };
      },
    }),
  };
}
