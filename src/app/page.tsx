import { getWorkspacePageData } from "@/lib/workspace-page-data";
import { Chat } from "./components/Chat";

export default async function Home() {
  const pageData = await getWorkspacePageData();

  return (
    <Chat
      activeChat={pageData.activeChat}
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
