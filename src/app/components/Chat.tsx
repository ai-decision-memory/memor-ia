"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Composer } from "./Composer";
import { MessageHistory } from "./MessageHistory";

export const Chat = ({
  githubPatError,
  githubPatSession,
  isSlackConnected,
  linearApiKeyError,
  linearApiKeySession,
}: {
  githubPatError: string | null;
  githubPatSession: {
    orgLogin: string;
    userLogin: string;
  } | null;
  isSlackConnected: boolean;
  linearApiKeyError: string | null;
  linearApiKeySession: {
    teamKey: string;
    teamName: string;
    userName: string;
  } | null;
}) => {
  if (!isSlackConnected || !githubPatSession || !linearApiKeySession) {
    return (
      <section className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-medium text-zinc-900">
          Connect Slack, add a GitHub PAT, and add a Linear API key to start chatting.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Slack is connected through OAuth. GitHub uses a fine-grained personal
          access token stored server-side for the current session. Linear uses a
          personal API key stored server-side for the current session.
        </p>
        <div className="mt-5 space-y-4 text-left">
          {isSlackConnected ? (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
              Slack connected
            </span>
          ) : (
            <a
              className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700"
              href="/api/slack/connect"
            >
              Connect Slack
            </a>
          )}

          {githubPatSession ? (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
              GitHub connected as {githubPatSession.userLogin} for {githubPatSession.orgLogin}
            </span>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-700">
                Generate a fine-grained PAT in{" "}
                <a
                  className="font-medium text-zinc-900 underline"
                  href="https://github.com/settings/personal-access-tokens/new"
                  rel="noreferrer"
                  target="_blank"
                >
                  GitHub settings
                </a>
                .
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
                <li>Set the organization as the resource owner.</li>
                <li>Select the repositories the agent should inspect.</li>
                <li>Grant repository read access to Contents, Deployments, Issues, and Metadata.</li>
                <li>Grant organization read access to Members so the agent can inspect teams and members.</li>
              </ul>
              {githubPatError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {githubPatError}
                </p>
              ) : null}
              <form
                action="/api/github/pat"
                method="post"
                className="space-y-3"
              >
                <div>
                  <label
                    className="block text-sm font-medium text-zinc-900"
                    htmlFor="github-org-login"
                  >
                    Organization login
                  </label>
                  <input
                    id="github-org-login"
                    name="organizationLogin"
                    type="text"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
                    placeholder="your-org"
                    required
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium text-zinc-900"
                    htmlFor="github-pat"
                  >
                    Fine-grained personal access token
                  </label>
                  <input
                    id="github-pat"
                    name="personalAccessToken"
                    type="password"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
                    placeholder="github_pat_..."
                    required
                  />
                </div>
                <button
                  className="inline-flex rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                  type="submit"
                >
                  Save GitHub PAT
                </button>
              </form>
            </div>
          )}

          {linearApiKeySession ? (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
              Linear connected as {linearApiKeySession.userName} for {linearApiKeySession.teamKey} ({linearApiKeySession.teamName})
            </span>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-700">
                Open Linear and generate a personal API key from{" "}
                <a
                  className="font-medium text-zinc-900 underline"
                  href="https://linear.app/settings/account/security"
                  rel="noreferrer"
                  target="_blank"
                >
                  Settings &gt; Account &gt; Security &amp; Access
                </a>
                .
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
                <li>If you do not see Personal API keys there, ask a Linear admin to enable Member API keys in Settings &gt; Administration &gt; API.</li>
                <li>You only need one personal API key here. There is no separate team API key for this app.</li>
                <li>Limit that API key to exactly one team. The app will infer the team automatically from the key.</li>
                <li>Grant read access so the assistant can inspect issues, projects, and workflow states.</li>
              </ul>
              {linearApiKeyError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {linearApiKeyError}
                </p>
              ) : null}
              <form
                action="/api/linear/api-key"
                method="post"
                className="space-y-3"
              >
                <div>
                  <label
                    className="block text-sm font-medium text-zinc-900"
                    htmlFor="linear-api-key"
                  >
                    Personal API key
                  </label>
                  <input
                    id="linear-api-key"
                    name="personalApiKey"
                    type="password"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
                    placeholder="lin_api_..."
                    required
                  />
                </div>
                <button
                  className="inline-flex rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                  type="submit"
                >
                  Save Linear API key
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    );
  }

  return <ConnectedChat />;
};

const ConnectedChat = () => {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, error } = useChat(); // default to /api/chat

  return (
    <section className="w-full max-w-2xl space-y-4">
      <MessageHistory messages={messages} />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

      <Composer
        input={input}
        onInputChange={setInput}
        onSendMessage={sendMessage}
        onStop={stop}
        status={status}
      />
    </section>
  );
};
