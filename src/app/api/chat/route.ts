import { createGitHubOrgTools } from "@/lib/github/org-tools";
import { createGitHubMCPClient } from "@/lib/mcp/github-mcp-client";
import { createLinearMCPClient } from "@/lib/mcp/linear-mcp-client";
import { sanitizeGitHubToolsForChat } from "@/lib/mcp/sanitize-github-tools";
import { sanitizeLinearToolsForChat } from "@/lib/mcp/sanitize-linear-tools";
import { WORKSPACE_ASSISTANT_SYSTEM_PROMPT } from "@/lib/prompts/workspace-assistant-system-prompt";
import {
  getAgentChat,
  updateAgentChatMessages,
} from "@/lib/supabase/agent-chats";
import { getGitHubPATSession } from "@/lib/supabase/github-pat-sessions";
import { getLinearApiKeySession } from "@/lib/supabase/linear-api-key-sessions";
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
      { error: "GitHub PAT and Linear API key are not connected" },
      { status: 401 }
    );
  }

  const [githubPatSession, linearApiKeySession] = await Promise.all([
    getGitHubPATSession(sessionId),
    getLinearApiKeySession(sessionId),
  ]);

  if (!githubPatSession?.github_pat) {
    return Response.json({ error: "GitHub PAT not connected" }, { status: 401 });
  }

  if (!linearApiKeySession?.linear_api_key) {
    return Response.json({ error: "Linear API key not connected" }, { status: 401 });
  }

  const { id: chatId, messages }: { id?: string; messages: UIMessage[] } =
    await request.json();

  if (!chatId) {
    return Response.json({ error: "Chat id is required" }, { status: 400 });
  }

  const chat = await getAgentChat({
    chatId,
    sessionId,
  });

  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  await updateAgentChatMessages({
    chatId,
    messages,
    sessionId,
  });

  const githubMCPClient = await createGitHubMCPClient(githubPatSession.github_pat);
  const linearMCPClient = await createLinearMCPClient(linearApiKeySession.linear_api_key);
  const [githubTools, linearTools] = await Promise.all([
    githubMCPClient.tools(),
    linearMCPClient.tools(),
  ]);

  const githubChatTools = sanitizeGitHubToolsForChat(
    githubTools as Record<string, Record<string, unknown>>,
    githubPatSession.github_org_login
  );
  const linearChatTools = sanitizeLinearToolsForChat(
    linearTools as Record<string, Record<string, unknown>>,
    {
      teamId: linearApiKeySession.linear_team_id,
      teamKey: linearApiKeySession.linear_team_key,
      teamName: linearApiKeySession.linear_team_name,
    }
  );
  const githubOrgTools = createGitHubOrgTools({
    githubOrgLogin: githubPatSession.github_org_login,
    githubPersonalAccessToken: githubPatSession.github_pat,
    githubUserLogin: githubPatSession.github_user_login,
  });
  const tools = {
    ...githubChatTools,
    ...linearChatTools,
    ...githubOrgTools,
  };
  const systemPrompt = [
    WORKSPACE_ASSISTANT_SYSTEM_PROMPT,
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
    originalMessages: messages,
    onFinish: async ({ messages: updatedMessages }) => {
      await updateAgentChatMessages({
        chatId,
        messages: updatedMessages,
        sessionId,
      });
      await Promise.all([
        githubMCPClient.close(),
        linearMCPClient.close(),
      ]);
    },
  });
}
