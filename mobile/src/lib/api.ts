import { supabase } from "./supabase";
import { SITE } from "./env";

/**
 * Calls a Next.js API route on the website.
 *
 * The website authenticates those routes with a cookie, which a native app has no
 * way to send. Instead we attach the signed-in user's Supabase access token as a
 * bearer header; `supabaseRoute()` on the server accepts either. Nothing about the
 * route's behaviour changes, so the phone and the browser hit identical logic
 * (subscription checks, plan limits, the emails that go out).
 */
export async function apiPost<T = unknown>(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  let token = "";
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? "";
  } catch {
    /* fall through: the route will answer 401 and we surface that */
  }

  let res: Response;
  try {
    res = await fetch(`${SITE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "No connection. Check your signal and try again.", status: 0 };
  }

  const payload = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    return {
      ok: false,
      error: payload?.error || "Something went wrong. Try again.",
      status: res.status,
    };
  }
  return { ok: true, data: payload as T };
}

/** Fire-and-forget: used for the notification emails, which must never block the UI. */
export function apiPostQuietly(path: string, body: Record<string, unknown>): void {
  void apiPost(path, body).catch(() => {});
}
