import { getWorkspacePageData } from "@/lib/workspace-page-data";
import { Chat } from "./components/Chat";

export default async function Home() {
  const pageData = await getWorkspacePageData();

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
