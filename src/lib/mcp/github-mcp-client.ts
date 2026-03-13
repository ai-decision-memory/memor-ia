import "server-only";
import { createMCPClient } from "@ai-sdk/mcp";

export const createGitHubMCPClient = async (githubToken: string) => {
  return await createMCPClient({
    transport: {
      type: "http",
      url: process.env.GITHUB_MCP_URL!,
      headers: {
        Authorization: `Bearer ${githubToken}`,
      },
    },
  });
};
