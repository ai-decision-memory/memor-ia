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
  const pageData = await getWorkspacePageData(chatId);

  if (pageData.sessionId && !pageData.activeChat) {
    redirect("/");
  }

  return (
    <Chat
      activeChat={pageData.activeChat}
      chats={pageData.chats}
      githubPatError={pageData.githubPatError}
      githubPatSession={pageData.githubPatSession}
      isSlackConnected={pageData.isSlackConnected}
      linearApiKeyError={pageData.linearApiKeyError}
      linearApiKeySession={pageData.linearApiKeySession}
      slackSession={pageData.slackSession}
    />
  );
}
