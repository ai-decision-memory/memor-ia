import "server-only";
import { normalizeSourceCitations, type SourceCitation } from "@/lib/citations";
import { supabaseRequest } from "@/lib/supabase/rest";
import type {
  AgentDocKind,
  AgentDocRecord,
  AgentDocSummary,
} from "@/lib/docs/types";

const AGENT_DOCS_TABLE = "agent_docs";

function normalizeAgentDocRecord(doc: AgentDocRecord | null) {
  if (!doc) {
    return null;
  }

  return {
    ...doc,
    citations: normalizeSourceCitations(doc.citations),
  };
}

export async function getAgentDocs({
  sessionId,
  workspaceId,
}: {
  sessionId: string;
  workspaceId: string;
}) {
  return await supabaseRequest<AgentDocSummary[]>({
    method: "GET",
    searchParams: {
      select: "id,title,kind,created_at,updated_at",
      session_id: `eq.${sessionId}`,
      workspace_id: `eq.${workspaceId}`,
      order: "updated_at.desc",
    },
    tableName: AGENT_DOCS_TABLE,
  });
}

export async function getAgentDoc({
  docId,
  sessionId,
}: {
  docId: string;
  sessionId: string;
}) {
  const docs = await supabaseRequest<AgentDocRecord[]>({
    method: "GET",
    searchParams: {
      select: "*",
      id: `eq.${docId}`,
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_DOCS_TABLE,
  });

  return normalizeAgentDocRecord(docs[0] ?? null);
}

export async function createAgentDoc({
  citations = [],
  content,
  kind,
  sessionId,
  sourceChatId,
  title,
  workspaceId,
}: {
  citations?: SourceCitation[];
  content: string;
  kind: AgentDocKind;
  sessionId: string;
  sourceChatId?: string | null;
  title: string;
  workspaceId: string;
}) {
  const docs = await supabaseRequest<AgentDocRecord[]>({
    body: {
      citations,
      content,
      kind,
      session_id: sessionId,
      source_chat_id: sourceChatId ?? null,
      title,
      workspace_id: workspaceId,
    },
    method: "POST",
    prefer: "return=representation",
    tableName: AGENT_DOCS_TABLE,
  });

  return normalizeAgentDocRecord(docs[0] ?? null);
}

export async function updateAgentDoc({
  content,
  docId,
  sessionId,
  title,
}: {
  content?: string;
  docId: string;
  sessionId: string;
  title?: string;
}) {
  const body: {
    content?: string;
    title?: string;
  } = {};

  if (content !== undefined) {
    body.content = content;
  }

  if (title !== undefined) {
    body.title = title;
  }

  const docs = await supabaseRequest<AgentDocRecord[]>({
    body,
    method: "PATCH",
    prefer: "return=representation",
    searchParams: {
      id: `eq.${docId}`,
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_DOCS_TABLE,
  });

  return normalizeAgentDocRecord(docs[0] ?? null);
}

export async function deleteAgentDoc({
  docId,
  sessionId,
}: {
  docId: string;
  sessionId: string;
}) {
  await supabaseRequest<null>({
    method: "DELETE",
    prefer: "return=minimal",
    searchParams: {
      id: `eq.${docId}`,
      session_id: `eq.${sessionId}`,
    },
    tableName: AGENT_DOCS_TABLE,
  });
}
