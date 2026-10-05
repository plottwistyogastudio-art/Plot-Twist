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

// fetch() that sends the signed-in user's token
export async function authFetch(url: string, init: RequestInit = {}) {
  const { data } = await supabaseBrowser().auth.getSession();
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (data.session) headers.set("authorization", `Bearer ${data.session.access_token}`);
  return fetch(url, { ...init, headers });
}
