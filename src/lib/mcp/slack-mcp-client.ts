import "server-only";
import { createMCPClient } from "@ai-sdk/mcp";
 
export const createSlackMCPClient = async (slackToken: string) => {
  return await createMCPClient({
    transport: {
      type: "http",
      url: process.env.SLACK_MCP_URL!,
      headers: {
        Authorization: `Bearer ${slackToken}`,
      },
    },
  });
};
