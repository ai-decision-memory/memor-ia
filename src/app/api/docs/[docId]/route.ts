import { normalizeDocTitle } from "@/lib/docs/title";
import {
  deleteAgentDoc,
  getAgentDoc,
  updateAgentDocTitle,
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
  const { title }: { title?: string } = await request.json();
  const updatedDoc = await updateAgentDocTitle({
    docId,
    sessionId,
    title: normalizeDocTitle(title),
  });

  if (!updatedDoc) {
    return Response.json({ error: "Doc not found" }, { status: 404 });
  }

  return Response.json({
    doc: {
      created_at: updatedDoc.created_at,
      id: updatedDoc.id,
      kind: updatedDoc.kind,
      title: updatedDoc.title,
      updated_at: updatedDoc.updated_at,
    },
  });
}
