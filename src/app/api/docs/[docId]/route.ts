import { normalizeDocTitle } from "@/lib/docs/title";
import {
  deleteAgentDoc,
  getAgentDoc,
  updateAgentDoc,
} from "@/lib/supabase/agent-docs";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{
    docId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const { docId } = await context.params;
  const doc = await getAgentDoc({
    docId,
    sessionId,
  });

  if (!doc) {
    return Response.json({ error: "Doc not found" }, { status: 404 });
  }

  return Response.json({ doc });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const { docId } = await context.params;
  await deleteAgentDoc({
    docId,
    sessionId,
  });

  return new Response(null, { status: 204 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionId = request.cookies.get("session_id")?.value;

  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 401 });
  }

  const { docId } = await context.params;
  const { content, title }: { content?: string; title?: string } = await request.json();
  const nextContent =
    typeof content === "string" ? content.replace(/\r\n/g, "\n") : undefined;
  const nextTitle =
    typeof title === "string" ? normalizeDocTitle(title) : undefined;

  if (nextContent === undefined && nextTitle === undefined) {
    return Response.json({ error: "No doc changes provided" }, { status: 400 });
  }

  if (nextContent !== undefined && nextContent.trim() === "") {
    return Response.json({ error: "Doc content cannot be empty" }, { status: 400 });
  }

  const updatedDoc = await updateAgentDoc({
    content: nextContent,
    docId,
    sessionId,
    title: nextTitle,
  });

  if (!updatedDoc) {
    return Response.json({ error: "Doc not found" }, { status: 404 });
  }

  return Response.json({ doc: updatedDoc });
}
