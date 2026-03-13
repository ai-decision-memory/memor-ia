import "server-only";

const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "slack-mcp-client",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

type GitHubAuthenticatedUserResponse = {
  id: number;
  login: string;
};

type GitHubRepositoryResponse = {
  full_name: string;
};

export type GitHubPATValidationResult = {
  githubOrgLogin: string;
  githubPatExpiresAt: string | null;
  githubPatLastValidatedAt: string;
  githubUserId: string;
  githubUserLogin: string;
  sampleRepositoryFullName: string | null;
};

function getGitHubAuthHeaders(githubPersonalAccessToken: string) {
  return {
    ...GITHUB_API_HEADERS,
    Authorization: `Bearer ${githubPersonalAccessToken}`,
  };
}

export async function validateGitHubPersonalAccessToken({
  githubOrgLogin,
  githubPersonalAccessToken,
}: {
  githubOrgLogin: string;
  githubPersonalAccessToken: string;
}): Promise<GitHubPATValidationResult> {
  const normalizedOrganizationLogin = githubOrgLogin.trim();

  if (!normalizedOrganizationLogin) {
    throw new Error("GitHub organization login is required");
  }

  const userResponse = await fetch("https://api.github.com/user", {
    cache: "no-store",
    headers: getGitHubAuthHeaders(githubPersonalAccessToken),
  });

  if (!userResponse.ok) {
    throw new Error("GitHub PAT validation failed for /user");
  }

  const authenticatedUser =
    (await userResponse.json()) as GitHubAuthenticatedUserResponse;

  const repositoriesUrl = new URL(
    `/orgs/${encodeURIComponent(normalizedOrganizationLogin)}/repos`,
    "https://api.github.com"
  );
  repositoriesUrl.searchParams.set("page", "1");
  repositoriesUrl.searchParams.set("per_page", "1");
  repositoriesUrl.searchParams.set("sort", "updated");
  repositoriesUrl.searchParams.set("type", "all");

  const repositoriesResponse = await fetch(repositoriesUrl, {
    cache: "no-store",
    headers: getGitHubAuthHeaders(githubPersonalAccessToken),
  });

  if (!repositoriesResponse.ok) {
    throw new Error(
      `GitHub PAT validation failed for organization ${normalizedOrganizationLogin}`
    );
  }

  const repositories =
    (await repositoriesResponse.json()) as GitHubRepositoryResponse[];

  const teamsUrl = new URL(
    `/orgs/${encodeURIComponent(normalizedOrganizationLogin)}/teams`,
    "https://api.github.com"
  );
  teamsUrl.searchParams.set("page", "1");
  teamsUrl.searchParams.set("per_page", "1");

  const teamsResponse = await fetch(teamsUrl, {
    cache: "no-store",
    headers: getGitHubAuthHeaders(githubPersonalAccessToken),
  });

  if (!teamsResponse.ok) {
    throw new Error(
      `GitHub PAT validation failed for organization ${normalizedOrganizationLogin}. Make sure the token has Members organization permission (read).`
    );
  }

  return {
    githubOrgLogin: normalizedOrganizationLogin,
    githubPatExpiresAt: null,
    githubPatLastValidatedAt: new Date().toISOString(),
    githubUserId: String(authenticatedUser.id),
    githubUserLogin: authenticatedUser.login,
    sampleRepositoryFullName: repositories[0]?.full_name ?? null,
  };
}
