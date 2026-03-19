import "./globals.css";
import { ChatWorkspaceProvider } from "./components/ChatWorkspaceProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <ChatWorkspaceProvider>{children}</ChatWorkspaceProvider>
      </body>
    </html>
  );
}
