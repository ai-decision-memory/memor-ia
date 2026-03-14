import "server-only";

type SupabaseErrorPayload = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
};

export function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  }

  return {
    secretKey,
    supabaseUrl,
  };
}

export async function supabaseRequest<T>({
  body,
  method,
  prefer,
  searchParams,
  tableName,
}: {
  body?: Record<string, unknown>;
  method: "DELETE" | "GET" | "PATCH" | "POST";
  prefer?: string;
  searchParams?: Record<string, string>;
  tableName: string;
}) {
  const { secretKey, supabaseUrl } = getSupabaseConfig();
  const url = new URL(`/rest/v1/${tableName}`, supabaseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: secretKey,
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase request failed with ${response.status}: ${errorText || "Unknown error"}`
    );
  }

  const responseText = await response.text();

  if (!responseText) {
    return null as T;
  }

  return JSON.parse(responseText) as T;
}

export function isSupabaseMissingTableError(error: unknown, tableName: string) {
  if (!(error instanceof Error)) {
    return false;
  }

  const prefix = "Supabase request failed with ";
  if (!error.message.startsWith(prefix)) {
    return false;
  }

  const separatorIndex = error.message.indexOf(": ");
  if (separatorIndex === -1) {
    return false;
  }

  const rawPayload = error.message.slice(separatorIndex + 2);

  try {
    const payload = JSON.parse(rawPayload) as SupabaseErrorPayload;
    return (
      payload.code === "PGRST205" &&
      Boolean(payload.message?.includes(`public.${tableName}`))
    );
  } catch {
    return false;
  }
}
