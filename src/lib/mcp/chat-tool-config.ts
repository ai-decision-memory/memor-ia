export const GITHUB_MCP_CHAT_TOOL_NAMES = [
  "get_file_contents",
  "list_branches",
  "list_commits",
  "list_issues",
] as const;

export const GITHUB_OWNER_SCOPED_TOOL_NAMES = [
  "get_file_contents",
  "list_branches",
  "list_commits",
  "list_issues",
] as const;

export const GITHUB_LOCAL_CHAT_TOOL_NAMES = [
  "github_get_connected_organization",
  "github_list_org_repositories",
  "github_list_org_teams",
  "github_get_team_members",
  "github_list_repository_deployments",
] as const;

export const LINEAR_ALLOWED_ACTION_PATTERNS = [
  /\bget\b/i,
  /\blist\b/i,
  /\bread\b/i,
  /\bsearch\b/i,
  /\bfind\b/i,
  /\bquery\b/i,
] as const;

export const LINEAR_ALLOWED_SUBJECT_PATTERNS = [
  /\bteam\b/i,
  /\bmember\b/i,
  /\bissue\b/i,
  /\bproject\b/i,
  /\bstate\b/i,
  /\bstatus\b/i,
  /\bworkflow\b/i,
] as const;

export const LINEAR_MEMBER_USER_PATTERNS = [
  /\buser\b/i,
  /\bmember\b/i,
] as const;

export const LINEAR_BLOCKED_PATTERNS = [
  /\bworkspace\b/i,
  /\borganization\b/i,
  /\bviewer\b/i,
  /\bmilestones?\b/i,
  /\bcreate\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /\bremove\b/i,
  /\barchive\b/i,
  /\bunarchive\b/i,
  /\bcomments?\b/i,
  /\bdocuments?\b/i,
  /\binitiatives?\b/i,
  /\bcycles?\b/i,
  /\blabels?\b/i,
  /\battachments?\b/i,
  /\bnotifications?\b/i,
  /\bwebhooks?\b/i,
  /\badmin\b/i,
  /\bassign\b/i,
  /\bmove\b/i,
  /\badd\b/i,
  /\blink\b/i,
  /\bunlink\b/i,
  /\btriage\b/i,
] as const;
