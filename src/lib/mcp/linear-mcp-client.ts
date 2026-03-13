import "server-only";
import { createMCPClient } from "@ai-sdk/mcp";

export const createLinearMCPClient = async (linearApiKey: string) => {
  return await createMCPClient({
    transport: {
      type: "http",
      url: process.env.LINEAR_MCP_URL!,
      headers: {
        Authorization: `Bearer ${linearApiKey}`,
      },
    },
  });
};
