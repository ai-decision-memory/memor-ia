import "server-only";
import { jsonSchema, tool } from "ai";

type SlackWorkspaceContext = {
  slackToken: string;
};

type SlackWorkspaceInfoResponse = {
  team: string;
  team_id: string;
  url: string;
  user: string;
  user_id: string;
};

type SlackUsersListResponse = {
  members?: SlackUser[];
  response_metadata?: {
    next_cursor?: string;
  };
};

type SlackUser = {
  id: string;
  name: string;
  deleted: boolean;
  is_admin: boolean;
  is_owner: boolean;
  is_bot: boolean;
  real_name?: string;
  profile?: {
    display_name?: string;
    email?: string;
    title?: string;
  };
};

type SlackConversationsListResponse = {
  channels?: SlackChannel[];
  response_metadata?: {
    next_cursor?: string;
  };
};

type SlackChannel = {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
  is_general?: boolean;
  is_member?: boolean;
  num_members?: number;
  purpose?: {
    value?: string;
  };
  topic?: {
    value?: string;
  };
};

type SlackSearchResultMessage = {
  author_name?: string;
  author_user_id?: string;
  channel_id?: string;
  channel_name?: string;
  content?: string;
  context_messages?: {
    after?: Array<{ text?: string; ts?: string; user_id?: string }>;
    before?: Array<{ text?: string; ts?: string; user_id?: string }>;
  };
  is_author_bot?: boolean;
  message_ts?: string;
  permalink?: string;
  team_id?: string;
};

type SlackSearchResultChannel = {
  creator_name?: string;
  creator_user_id?: string;
  date_created?: number;
  date_updated?: number;
  name?: string;
  permalink?: string;
  purpose?: string;
  team_id?: string;
  topic?: string;
};

type SlackSearchResultFile = {
  author_name?: string;
  author_user_id?: string;
  content?: string;
  date_created?: number;
  date_updated?: number;
  file_id?: string;
  file_type?: string;
  permalink?: string;
  team_id?: string;
  title?: string;
  uploader_user_id?: string;
};

type SlackSearchResultUser = {
  display_name?: string;
  email?: string;
  name?: string;
  permalink?: string;
  team_id?: string;
  title?: string;
  user_id?: string;
};

type SlackSearchContextResponse = {
  results?: {
    channels?: SlackSearchResultChannel[];
    files?: SlackSearchResultFile[];
    messages?: SlackSearchResultMessage[];
    users?: SlackSearchResultUser[];
  };
  response_metadata?: {
    next_cursor?: string;
  };
};

type SlackListMembersInput = {
  includeDeleted?: boolean;
  limit?: number;
};

type SlackListChannelsInput = {
  includeArchived?: boolean;
  includeDirectMessages?: boolean;
  includePrivateChannels?: boolean;
  limit?: number;
};

type SlackSearchWorkspaceContextInput = {
  after?: number;
  before?: number;
  contentTypes?: string[];
  includeBots?: boolean;
  includeContextMessages?: boolean;
  limit?: number;
  query: string;
  sort?: "score" | "timestamp";
  sortDirection?: "asc" | "desc";
};

const SLACK_API_BASE_URL = "https://slack.com/api/";
const SLACK_API_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
  "User-Agent": "slack-mcp-client",
} as const;

async function callSlackApi<T>({
  method,
  slackToken,
  params,
}: {
  method: string;
  params?: Record<string, string>;
  slackToken: string;
}) {
  const body = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    body.set(key, value);
  });

  const response = await fetch(new URL(method, SLACK_API_BASE_URL), {
    method: "POST",
    cache: "no-store",
    headers: {
      ...SLACK_API_HEADERS,
      Authorization: `Bearer ${slackToken}`,
    },
    body,
  });

  const payload = (await response.json()) as T & {
    error?: string;
    ok?: boolean;
  };

  if (!response.ok || payload.ok === false) {
    throw new Error(
      `Slack API ${method} failed${payload.error ? `: ${payload.error}` : ""}`
    );
  }

  return payload;
}

async function collectSlackPages<TItem, TResponse extends { response_metadata?: { next_cursor?: string } }>(
  fetchPage: (cursor?: string) => Promise<TResponse>,
  getItems: (response: TResponse) => TItem[],
  limit: number
) {
  const items: TItem[] = [];
  let cursor: string | undefined;

  while (items.length < limit) {
    const response = await fetchPage(cursor);
    items.push(...getItems(response));

    cursor = response.response_metadata?.next_cursor?.trim() || undefined;
    if (!cursor) {
      break;
    }
  }

  return items.slice(0, limit);
}

export function createSlackWorkspaceTools({ slackToken }: SlackWorkspaceContext) {
  return {
    slack_get_connected_workspace: tool({
      description:
        "Return the connected Slack workspace name, URL, and connected user.",
      inputSchema: jsonSchema<Record<string, never>>({
        additionalProperties: false,
        properties: {},
        type: "object",
      }),
      execute: async () => {
        const response = await callSlackApi<SlackWorkspaceInfoResponse>({
          method: "auth.test",
          slackToken,
        });

        return {
          teamId: response.team_id,
          teamName: response.team,
          userId: response.user_id,
          userName: response.user,
          workspaceUrl: response.url,
        };
      },
    }),
    slack_list_workspace_members: tool({
      description:
        "List members in the connected Slack workspace. Use this for workspace member and user lookup questions.",
      inputSchema: jsonSchema<SlackListMembersInput>({
        additionalProperties: false,
        properties: {
          includeDeleted: {
            type: "boolean",
          },
          limit: {
            maximum: 500,
            minimum: 1,
            type: "number",
          },
        },
        type: "object",
      }),
      execute: async ({ includeDeleted = false, limit = 200 }) => {
        const members = await collectSlackPages<SlackUser, SlackUsersListResponse>(
          (cursor) =>
            callSlackApi<SlackUsersListResponse>({
              method: "users.list",
              params: {
                ...(cursor ? { cursor } : {}),
                limit: String(Math.min(limit, 200)),
              },
              slackToken,
            }),
          (response) => response.members ?? [],
          Math.min(limit, 500)
        );

        return {
          members: members
            .filter((member) => (includeDeleted ? true : !member.deleted))
            .map((member) => ({
              displayName: member.profile?.display_name ?? "",
              email: member.profile?.email ?? null,
              id: member.id,
              isAdmin: member.is_admin,
              isBot: member.is_bot,
              isDeleted: member.deleted,
              isOwner: member.is_owner,
              name: member.name,
              realName: member.real_name ?? "",
              title: member.profile?.title ?? "",
            })),
        };
      },
    }),
    slack_list_channels: tool({
      description:
        "List channels in the connected Slack workspace. Use this to inspect the available channel inventory instead of guessing channel names.",
      inputSchema: jsonSchema<SlackListChannelsInput>({
        additionalProperties: false,
        properties: {
          includeArchived: {
            type: "boolean",
          },
          includeDirectMessages: {
            type: "boolean",
          },
          includePrivateChannels: {
            type: "boolean",
          },
          limit: {
            maximum: 500,
            minimum: 1,
            type: "number",
          },
        },
        type: "object",
      }),
      execute: async ({
        includeArchived = false,
        includeDirectMessages = false,
        includePrivateChannels = true,
        limit = 200,
      }) => {
        const types = [
          "public_channel",
          ...(includePrivateChannels ? ["private_channel"] : []),
          ...(includeDirectMessages ? ["im", "mpim"] : []),
        ].join(",");

        const channels = await collectSlackPages<SlackChannel, SlackConversationsListResponse>(
          (cursor) =>
            callSlackApi<SlackConversationsListResponse>({
              method: "conversations.list",
              params: {
                ...(cursor ? { cursor } : {}),
                exclude_archived: includeArchived ? "false" : "true",
                limit: String(Math.min(limit, 200)),
                types,
              },
              slackToken,
            }),
          (response) => response.channels ?? [],
          Math.min(limit, 500)
        );

        return {
          channels: channels.map((channel) => ({
            id: channel.id,
            isArchived: channel.is_archived,
            isGeneral: channel.is_general ?? false,
            isMember: channel.is_member ?? false,
            isPrivate: channel.is_private,
            memberCount: channel.num_members ?? null,
            name: channel.name,
            purpose: channel.purpose?.value ?? "",
            topic: channel.topic?.value ?? "",
          })),
        };
      },
    }),
    slack_search_workspace_context: tool({
      description:
        "Search the connected Slack workspace for relevant messages, files, channels, and users. Prefer natural-language questions here to trigger semantic search when available.",
      inputSchema: jsonSchema<SlackSearchWorkspaceContextInput>({
        additionalProperties: false,
        properties: {
          after: {
            type: "number",
          },
          before: {
            type: "number",
          },
          contentTypes: {
            items: {
              enum: ["messages", "files", "channels", "users"],
              type: "string",
            },
            type: "array",
          },
          includeBots: {
            type: "boolean",
          },
          includeContextMessages: {
            type: "boolean",
          },
          limit: {
            maximum: 20,
            minimum: 1,
            type: "number",
          },
          query: {
            minLength: 1,
            type: "string",
          },
          sort: {
            enum: ["score", "timestamp"],
            type: "string",
          },
          sortDirection: {
            enum: ["asc", "desc"],
            type: "string",
          },
        },
        required: ["query"],
        type: "object",
      }),
      execute: async ({
        after,
        before,
        contentTypes = ["messages", "channels"],
        includeBots = false,
        includeContextMessages = true,
        limit = 10,
        query,
        sort = "score",
        sortDirection = "desc",
      }) => {
        const response = await callSlackApi<SlackSearchContextResponse>({
          method: "assistant.search.context",
          params: {
            ...(after ? { after: String(after) } : {}),
            ...(before ? { before: String(before) } : {}),
            channel_types: "public_channel,private_channel,mpim,im",
            content_types: contentTypes.join(","),
            highlight: "false",
            include_bots: includeBots ? "true" : "false",
            include_context_messages: includeContextMessages ? "true" : "false",
            limit: String(Math.min(limit, 20)),
            query,
            sort,
            sort_dir: sortDirection,
          },
          slackToken,
        });

        return {
          channels:
            response.results?.channels?.map((channel) => ({
              createdAt: channel.date_created ?? null,
              creatorName: channel.creator_name ?? null,
              creatorUserId: channel.creator_user_id ?? null,
              name: channel.name ?? null,
              permalink: channel.permalink ?? null,
              purpose: channel.purpose ?? null,
              teamId: channel.team_id ?? null,
              topic: channel.topic ?? null,
              updatedAt: channel.date_updated ?? null,
            })) ?? [],
          files:
            response.results?.files?.map((file) => ({
              authorName: file.author_name ?? null,
              authorUserId: file.author_user_id ?? null,
              content: file.content ?? null,
              createdAt: file.date_created ?? null,
              fileId: file.file_id ?? null,
              fileType: file.file_type ?? null,
              permalink: file.permalink ?? null,
              title: file.title ?? null,
              updatedAt: file.date_updated ?? null,
              uploaderUserId: file.uploader_user_id ?? null,
            })) ?? [],
          hasMore: Boolean(response.response_metadata?.next_cursor),
          messages:
            response.results?.messages?.map((message) => ({
              authorName: message.author_name ?? null,
              authorUserId: message.author_user_id ?? null,
              channelId: message.channel_id ?? null,
              channelName: message.channel_name ?? null,
              content: message.content ?? null,
              contextMessages: message.context_messages ?? null,
              isAuthorBot: message.is_author_bot ?? false,
              permalink: message.permalink ?? null,
              teamId: message.team_id ?? null,
              timestamp: message.message_ts ?? null,
            })) ?? [],
          nextCursor: response.response_metadata?.next_cursor ?? "",
          users:
            response.results?.users?.map((user) => ({
              displayName: user.display_name ?? null,
              email: user.email ?? null,
              name: user.name ?? null,
              permalink: user.permalink ?? null,
              teamId: user.team_id ?? null,
              title: user.title ?? null,
              userId: user.user_id ?? null,
            })) ?? [],
        };
      },
    }),
  };
}
