import { createSlackWorkspaceTools } from "@/lib/slack/workspace-tools";
import { createGitHubOrgTools } from "@/lib/github/org-tools";
import { createGitHubMCPClient } from "@/lib/mcp/github-mcp-client";
import { createLinearMCPClient } from "@/lib/mcp/linear-mcp-client";
import { sanitizeGitHubToolsForChat } from "@/lib/mcp/sanitize-github-tools";
import { sanitizeLinearToolsForChat } from "@/lib/mcp/sanitize-linear-tools";
import { createSlackMCPClient } from "@/lib/mcp/slack-mcp-client";
import { sanitizeSlackToolsForChat } from "@/lib/mcp/sanitize-slack-tools";
import { WORKSPACE_ASSISTANT_SYSTEM_PROMPT } from "@/lib/prompts/workspace-assistant-system-prompt";
import { getGitHubPATSession } from "@/lib/supabase/github-pat-sessions";
import { getLinearApiKeySession } from "@/lib/supabase/linear-api-key-sessions";
import { getSlackOAuthSession } from "@/lib/supabase/slack-oauth-sessions";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json(
      { error: "Slack workspace, GitHub PAT, and Linear API key are not connected" },
      { status: 401 }
    );
  }

  const [slackSession, githubPatSession, linearApiKeySession] = await Promise.all([
    getSlackOAuthSession(sessionId),
    getGitHubPATSession(sessionId),
    getLinearApiKeySession(sessionId),
  ]);

  if (!slackSession?.slack_access_token) {
    return Response.json({ error: "Slack workspace not connected" }, { status: 401 });
  }

  if (!githubPatSession?.github_pat) {
    return Response.json({ error: "GitHub PAT not connected" }, { status: 401 });
  }

  if (!linearApiKeySession?.linear_api_key) {
    return Response.json({ error: "Linear API key not connected" }, { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await request.json();
  const slackMCPClient = await createSlackMCPClient(slackSession.slack_access_token);
  const githubMCPClient = await createGitHubMCPClient(githubPatSession.github_pat);
  const linearMCPClient = await createLinearMCPClient(linearApiKeySession.linear_api_key);
  const [slackTools, githubTools, linearTools] = await Promise.all([
    slackMCPClient.tools(),
    githubMCPClient.tools(),
    linearMCPClient.tools(),
  ]);

  const slackChatTools = sanitizeSlackToolsForChat(
    slackTools as Record<string, Record<string, unknown>>
  ) as typeof slackTools;
  const slackWorkspaceTools = createSlackWorkspaceTools({
    slackToken: slackSession.slack_access_token,
  });
  const githubChatTools = sanitizeGitHubToolsForChat(
    githubTools as Record<string, Record<string, unknown>>,
    githubPatSession.github_org_login
  ) as unknown as typeof githubTools;
  const linearChatTools = sanitizeLinearToolsForChat(
    linearTools as Record<string, Record<string, unknown>>,
    {
      teamId: linearApiKeySession.linear_team_id,
      teamKey: linearApiKeySession.linear_team_key,
      teamName: linearApiKeySession.linear_team_name,
    }
  ) as typeof linearTools;
  const githubOrgTools = createGitHubOrgTools({
    githubOrgLogin: githubPatSession.github_org_login,
    githubPersonalAccessToken: githubPatSession.github_pat,
    githubUserLogin: githubPatSession.github_user_login,
  });
  const tools = {
    ...slackChatTools,
    ...slackWorkspaceTools,
    ...githubChatTools,
    ...linearChatTools,
    ...githubOrgTools,
  };
  const systemPrompt = [
    WORKSPACE_ASSISTANT_SYSTEM_PROMPT,
    `Connected Slack workspace user ID: ${slackSession.slack_user_id}.`,
    `Connected Slack workspace team ID: ${slackSession.slack_team_id}.`,
    `Connected GitHub organization: ${githubPatSession.github_org_login}.`,
    `Connected GitHub user: ${githubPatSession.github_user_login}.`,
    `Connected Linear team: ${linearApiKeySession.linear_team_key} (${linearApiKeySession.linear_team_name}).`,
    `Connected Linear user: ${linearApiKeySession.linear_user_name}.`,
    "Never use GitHub tools outside that organization.",
    "Never use Linear tools outside that team.",
  ].join("\n\n");

  const result = streamText({
    system: systemPrompt,
    model: openai("gpt-4o"),
    tools,
    stopWhen: stepCountIs(8),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async () => {
      await Promise.all([
        slackMCPClient.close(),
        githubMCPClient.close(),
        linearMCPClient.close(),
      ]);
    },
  });
}
