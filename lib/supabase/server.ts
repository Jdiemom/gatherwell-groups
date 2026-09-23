import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Supabase client for Server Components / Route Handlers, acting as the signed-in user. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; middleware-less apps can ignore.
          }
        },
      },
    }
  );
}

/**
 * Supabase client for a Route Handler, acting as the signed-in user, whether that
 * user arrived from the website or from the mobile app.
 *
 * The browser authenticates with a cookie. A native app has no cookie jar, so the
 * Groups by Gatherwell app sends the same Supabase access token as a bearer
 * header instead. Both end up as the same authenticated user with the same row
 * level security, so a route written once behaves identically for both clients.
 */
export async function supabaseRoute(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";

  if (token) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );
  }

  return supabaseServer();
}
