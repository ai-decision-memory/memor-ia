import { getWorkspacePageData } from "@/lib/workspace-page-data";
import { redirect } from "next/navigation";
import { Chat } from "../../components/Chat";

type DocPageProps = {
  params: Promise<{
    docId: string;
  }>;
};

export default async function DocPage({ params }: DocPageProps) {
  const { docId } = await params;
  const pageData = await getWorkspacePageData({ activeDocId: docId });

  if (pageData.sessionId && !pageData.activeDoc) {
    redirect("/");
  }

  return (
    <Chat
      activeChat={null}
      activeDoc={pageData.activeDoc}
      chats={pageData.chats}
      docs={pageData.docs}
      githubPatError={pageData.githubPatError}
      githubPatSession={pageData.githubPatSession}
      linearApiKeyError={pageData.linearApiKeyError}
      linearApiKeySession={pageData.linearApiKeySession}
    />
  );
}
