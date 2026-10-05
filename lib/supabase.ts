import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser client (anon key): sign in / sign up only.
let browser: SupabaseClient | null = null;
export function supabaseBrowser(): SupabaseClient {
  if (!browser) {
    browser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browser;
}

// Server client (service role): bypasses row level security. Server code only.
export function supabaseAdmin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// Returns the signed-in user for an API request, or null.
export async function getUser(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  return error ? null : data.user;
}

// fetch() that sends the signed-in user's token.
// If the server says 401/403 (for example the login expired while the page stayed open),
// it refreshes the login once and tries again.
export async function authFetch(url: string, init: RequestInit = {}) {
  const run = async (refresh: boolean) => {
    const sb = supabaseBrowser();
    const { data } = refresh ? await sb.auth.refreshSession() : await sb.auth.getSession();
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    if (data.session) headers.set("authorization", `Bearer ${data.session.access_token}`);
    return fetch(url, { ...init, headers });
  };
  const first = await run(false);
  if (first.status !== 401 && first.status !== 403) return first;
  return run(true);
}

export const SESSION_EXPIRED = "Your login seems to have expired. Reload this page (or log out and back in), then try again.";
