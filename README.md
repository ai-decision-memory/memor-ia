# Memor-ia

Memor-ia is an agentic decision-support app for technical and product teams. Users ask questions in a chat interface, and the assistant answers with evidence gathered from connected work systems through MCP tools.

This README documents both:

- the intended product direction you described
- the current implementation that exists in this repository

When those differ, this document calls that out explicitly.

## Product Objective

Memor-ia exists to help technical and product teams answer decision questions faster, with evidence instead of guesswork.

The core objective is to let a team ask questions such as:

- What happened in delivery this week?
- Which issues are blocked?
- What changed in a repository before a release?
- What evidence supports a product or execution decision?

Instead of relying on memory or manual cross-checking, the app should gather the relevant context from the team's connected systems and return an answer in chat.

## Product Vision

The target product is:

- a chat-first interface for technical and product teams
- an agent that answers decision questions
- grounded in evidence from Notion, Linear, and GitHub
- powered through MCP-based tool access

## Current Product Scope In This Repo

The current codebase implements:

- GitHub connectivity
- Linear connectivity
- a chat UI
- persistent chat history
- tool-constrained evidence retrieval through MCP

The current codebase does not yet implement:

- Notion connectivity
- Notion MCP tools
- multi-workspace or multi-org selection
- write actions back into GitHub or Linear
- OAuth-based account linking

## Product Decisions

These are the main product decisions that are either explicitly stated by you or clearly reflected in the code.

### 1. Chat is the primary interface

Users interact with Memor-ia by asking natural-language questions in a conversation UI instead of navigating dashboards, filters, or forms.

Why this matters:

- the product is optimized for decision questions, not record editing
- the assistant can translate ambiguous requests into a sequence of evidence lookups
- the interface stays simple even when the underlying systems are complex

### 2. The app is evidence-first, not opinion-first

The assistant is meant to answer using live workspace data. The system prompt explicitly tells the model to use tools, avoid fabrication, and explain what was searched when nothing is found.

Why this matters:

- trust depends on answers being grounded in source systems
- the product is meant for operational and product decisions, where unsupported answers are costly

### 3. Workspace access is intentionally scoped

Each session is bound to:

- one GitHub organization
- one Linear team

The assistant is explicitly instructed not to operate outside those scopes.

Why this matters:

- it reduces accidental cross-tenant access
- it narrows the search space for better tool use
- it keeps answers relevant to one team's operating context

### 4. Connections are user-supplied and direct

The current implementation uses:

- a GitHub fine-grained PAT
- a Linear personal API key

Why this matters:

- it is fast to implement
- it avoids building OAuth flows early
- it gives the product a clear path to validate access before chat begins

Tradeoff:

- this is operationally simpler than OAuth, but weaker from a product polish and credential-management standpoint

### 5. The assistant is currently read-only

The exposed tools are restricted to retrieval-oriented operations. Linear tools are filtered heavily to avoid create, update, delete, admin, and workspace-wide operations. GitHub exposure is also narrowed to a small safe set plus a few custom org tools.

Why this matters:

- the product is currently focused on understanding and decision support
- read-only access lowers the risk of unintended side effects

### 6. The product is optimized for delivery and execution questions first

The connected data sources in the repo today are GitHub and Linear, which cover:

- source code and repository structure
- commits, branches, deployments, and issues
- Linear issues, projects, workflow state, and team context

Why this matters:

- this makes the current product strongest at engineering execution and delivery questions
- knowledge-management questions tied to Notion appear to be part of the target product, but are not yet implemented

### 7. Conversation history is part of the product, not just a transport detail

Chats are persisted and listed in a sidebar. Users can create, rename, revisit, and delete conversations.

Why this matters:

- decision work is iterative
- teams often revisit the same thread of investigation over time

## Main User Flow

1. The user opens the app.
2. The user connects GitHub by supplying an organization login and PAT.
3. The user connects Linear by supplying a personal API key.
4. The app validates both credentials before enabling useful chat behavior.
5. The user starts a conversation and asks a question.
6. The backend streams a model response while the model calls scoped tools.
7. The conversation is stored and can be reopened later.

## Technical Overview

### Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- `motion` for UI animation
- Vercel AI SDK 6
- `@ai-sdk/react` for chat state
- `@ai-sdk/mcp` for MCP clients
- `@ai-sdk/openai` for the model provider
- Supabase REST API for persistence

### Runtime Architecture

At a high level:

- the frontend renders a chat workspace and connection modals
- API routes validate and store connection credentials
- the chat route loads session-scoped tools, runs the model, and streams the answer
- Supabase stores chat history and connection state

### Important Routes

- `src/app/page.tsx`
  - loads workspace state and renders the main chat screen
- `src/app/chats/[chatId]/page.tsx`
  - loads a specific persisted chat
- `src/app/api/chat/route.ts`
  - main streaming chat endpoint
- `src/app/api/chats/route.ts`
  - create and list chats
- `src/app/api/chats/[chatId]/route.ts`
  - fetch, rename, and delete a chat
- `src/app/api/github/pat/route.ts`
  - validate and save GitHub credentials
- `src/app/api/linear/api-key/route.ts`
  - validate and save Linear credentials
- `src/app/api/linear/debug/tools/route.ts`
  - inspect raw vs sanitized Linear tools
- `src/app/api/linear/debug/call/route.ts`
  - call a Linear tool in debug mode

## Chat And Agent Flow

The core request lifecycle is:

1. The client sends messages to `/api/chat`.
2. The route reads the `session_id` cookie.
3. The route loads the GitHub and Linear session records from Supabase.
4. The current chat's messages are persisted before model execution.
5. The server creates MCP clients for GitHub and Linear using session credentials.
6. The raw MCP tool sets are fetched.
7. The app sanitizes those tool sets before exposing them to the model.
8. The server adds custom GitHub organization tools that are not coming from MCP.
9. The server builds a system prompt that includes the connected org, user, team, and scope rules.
10. The app calls `streamText` with OpenAI and the merged tool set.
11. The response streams back to the UI.
12. On finish, updated messages are saved and MCP clients are closed.

### Model Behavior

The current implementation uses:

- `openai("gpt-4o")`
- `streamText(...)`
- `stopWhen: stepCountIs(8)`

That means the app allows up to eight reasoning/tool steps before stopping.

## MCP Integration

### GitHub

GitHub MCP access is created through an HTTP transport whose base URL is taken from `GITHUB_MCP_URL`.

The model does not receive the full raw GitHub tool surface. Instead, the app exposes a narrowed set of repository tools:

- `get_file_contents`
- `list_branches`
- `list_commits`
- `list_issues`

These are renamed with a `github_` prefix before the model sees them.

For owner-scoped GitHub tools, the app injects the connected organization automatically and removes the `owner` field from the visible schema. This prevents the model from drifting outside the connected org.

The app also defines custom non-MCP GitHub tools in `src/lib/github/org-tools.ts` for:

- returning the connected organization and PAT user
- listing organization repositories
- listing organization teams
- listing members of a team
- listing repository deployments

### Linear

Linear MCP access is created through an HTTP transport whose base URL is taken from `LINEAR_MCP_URL`.

The raw Linear tool set is filtered much more aggressively than GitHub:

- only retrieval-like actions are allowed
- only team, member, issue, project, state, status, and workflow subjects are allowed
- admin, workspace, viewer, comments, cycles, labels, attachments, and all write-like actions are blocked

For tools that accept team-scoping fields such as `team`, `teamId`, `teamKey`, or `teamName`, the app injects the connected team's values automatically and removes those fields from the visible schema.

Linear tool execution is also wrapped in an error boundary so tool failures return structured unavailable/error payloads instead of crashing the route.

### Notion

Notion is part of the intended product story, but there is no Notion integration in the current repository. There are no Notion MCP clients, routes, validators, or UI connection flows yet.

## Prompting And Guardrails

The main system prompt lives in `src/lib/prompts/workspace-assistant-system-prompt.ts`.

Key behaviors enforced there:

- use tools instead of guessing
- never invent repositories, issues, projects, commits, or statuses
- start GitHub work from the connected organization
- start Linear work from the connected team
- never use GitHub tools for Linear questions
- never use Linear tools for GitHub questions
- try relevant alternative lookups before concluding that no data exists
- explain what was searched when nothing is found

The chat route also appends session-specific scope facts to the prompt, including:

- connected GitHub organization
- connected GitHub user
- connected Linear team
- connected Linear user

## Frontend Behavior

The main UI lives in `src/app/components/Chat.tsx`.

Current UX behavior includes:

- a sidebar of saved chats
- a new chat flow
- rename and delete chat actions
- a connection panel for GitHub and Linear
- modal forms for both credentials
- a streaming message view
- inline status text for tool activity
- animated loading and composer states

The client chat state is managed with `useChat` from `@ai-sdk/react`.

Notable implementation details:

- a new chat record is created before the first prompt is actually sent to the model
- the app uses a transient in-memory chat until routing catches up
- tool activity is rendered in the message history so users can see evidence gathering in progress
- completed tool calls are also logged in the browser console

## Session And Credential Model

The app uses a browser cookie called `session_id` as the primary session key.

Connection flow:

- the GitHub PAT route validates a token against the GitHub API
- the Linear API key route validates a key against the Linear GraphQL API
- if validation passes, the credential metadata is persisted in Supabase
- the `session_id` cookie is set as an HTTP-only cookie
- temporary error cookies are used to surface connection failures back to the UI

Important current behavior:

- the app is session-based, not user-account-based
- there is no built-in sign-in system in this repo
- credentials are stored server-side and keyed by `session_id`
- the current repository does not implement app-layer encryption for those stored credentials

## Persistence Layer

Persistence is implemented through direct Supabase REST calls in `src/lib/supabase/rest.ts` using:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

There is no ORM in this repo.

### Tables

#### `github_pat_sessions`

Stores:

- `session_id`
- raw GitHub PAT
- validation timestamps
- connected GitHub organization login
- connected GitHub user id/login

Defined in:

- `supabase/migrations/20260312110000_create_github_pat_sessions.sql`

#### `linear_api_key_sessions`

Stores:

- `session_id`
- raw Linear API key
- validation timestamps
- connected Linear team id/key/name
- connected Linear user id/name

Defined in:

- `supabase/migrations/20260312130000_create_linear_api_key_sessions.sql`

#### `agent_chats`

Stores:

- chat id
- `session_id`
- chat title
- serialized `UIMessage[]` payload as JSONB
- timestamps

Defined in:

- `supabase/migrations/20260313113000_create_agent_chats.sql`

## Repository Structure

`src/app/`

- App Router pages, API routes, global styles, and chat UI components

`src/lib/mcp/`

- MCP client creation and tool sanitization logic

`src/lib/github/`

- GitHub PAT validation and custom org-scoped tools

`src/lib/linear/`

- Linear API key validation

`src/lib/supabase/`

- direct REST persistence helpers

`supabase/migrations/`

- schema setup for stored sessions and chats

## Environment Variables

The codebase currently requires these variables:

- `GITHUB_MCP_URL`
- `LINEAR_MCP_URL`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Optional:

- `APP_URL`

Inferred runtime requirement:

- `OPENAI_API_KEY`

The app uses `@ai-sdk/openai` with `openai("gpt-4o")`, so an OpenAI API key is expected at runtime even though it is not referenced directly in this repo.

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Set the required environment variables.

3. Apply the Supabase migrations in `supabase/migrations/` using your Supabase workflow.

4. Start the app:

```bash
pnpm dev
```

5. Open the app, connect GitHub and Linear, and start chatting.

## Current Constraints And Gaps

These are the biggest current limitations visible in the repo:

- Notion is part of the intended product, but is not implemented
- the app is tied to one GitHub org and one Linear team per session
- there is no user authentication layer beyond the session cookie
- the model is currently fixed to `gpt-4o`
- there are no automated tests in this repository
- chat titles default to `New Chat`; title-generation helpers exist but are not currently wired into chat creation
- the package name still reads `slack-mcp-client`, which appears to be leftover naming from an earlier codebase state

## Recommended Near-Term Next Steps

If the goal is to align the implementation with the product vision, the highest-value next steps are:

1. Add Notion connectivity and sanitize a read-only Notion MCP tool surface the same way GitHub and Linear are handled.
2. Replace raw PAT/API-key entry with a more robust auth and credential-management model when product maturity requires it.
3. Improve answer traceability by attaching explicit source citations or evidence summaries to each response.
4. Add tests around tool sanitization, session persistence, and chat route behavior.

## Summary

Memor-ia is currently a scoped, read-only, chat-based workspace agent for GitHub and Linear. Its product direction is broader: help technical and product teams answer decision questions using evidence from GitHub, Linear, and Notion. The architecture in this repo already establishes the core pattern for that vision:

- connect a workspace
- constrain tool access
- stream grounded answers in chat
- persist the conversation for later reuse
