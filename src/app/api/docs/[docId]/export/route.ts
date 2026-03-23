import {
  buildDocDownloadName,
  createMarkdownExport,
  createPdfExport,
} from "@/lib/docs/export";
import { getAgentDoc } from "@/lib/supabase/agent-docs";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{
    docId: string;
  }>;
};

function buildHeaders(fileName: string, contentType: string) {
  return {
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Content-Type": contentType,
  };
}

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

  const format = request.nextUrl.searchParams.get("format");

  if (format === "md") {
    return new Response(createMarkdownExport(doc.content), {
      headers: buildHeaders(
        buildDocDownloadName(doc.title, "md"),
        "text/markdown; charset=utf-8",
      ),
    });
  }

  if (format === "pdf") {
    return new Response(createPdfExport(doc.content), {
      headers: buildHeaders(
        buildDocDownloadName(doc.title, "pdf"),
        "application/pdf",
      ),
    });
  }

  return Response.json({ error: "Unsupported export format" }, { status: 400 });
}
