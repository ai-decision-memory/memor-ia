import { getWorkspacePageData } from "@/lib/workspace-page-data";
import { redirect } from "next/navigation";
import { Chat } from "../../components/Chat";

type ChatPageProps = {
  params: Promise<{
    chatId: string;
  }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;
  const pageData = await getWorkspacePageData({ activeChatId: chatId });

  if (pageData.sessionId && !pageData.activeChat) {
    redirect("/");
  }

  return (
    <Chat
      activeChat={pageData.activeChat}
      activeDoc={pageData.activeDoc}
      activeWorkspace={pageData.activeWorkspace}
      chats={pageData.chats}
      docs={pageData.docs}
      githubPatError={pageData.githubPatError}
      githubPatSession={pageData.githubPatSession}
      linearApiKeyError={pageData.linearApiKeyError}
      linearApiKeySession={pageData.linearApiKeySession}
      pinnedPrompts={pageData.pinnedPrompts}
      workspaces={pageData.workspaces}
    />
  );
}
