import { getWorkspacePageData } from "@/lib/workspace-page-data";
import { Chat } from "./components/Chat";

type HomePageProps = {
  searchParams: Promise<{
    workspaceId?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const { workspaceId } = await searchParams;
  const pageData = await getWorkspacePageData({ activeWorkspaceId: workspaceId });

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
