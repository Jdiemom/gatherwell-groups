import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdvisorEmail } from "@/lib/notify";

const KIND_LABEL: Record<string, string> = {
  idea: "Feature idea",
  confusing: "Something confusing",
  broken: "Something broken",
  praise: "Praise",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Light spam brake. Per server instance only, which is enough to stop a bored script. */
const recent = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function tooMany(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > MAX_PER_WINDOW;
}

/** Live feedback from anywhere on the site. Works signed in or signed out. */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (tooMany(ip)) {
    return NextResponse.json(
      { error: "That is a lot of feedback in one sitting. Try again a little later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));

  const kind = KIND_LABEL[String(body.kind ?? "")] ? String(body.kind) : "idea";
  const message = String(body.message ?? "").trim().slice(0, 2000);
  const page = String(body.page ?? "").slice(0, 200);
  const typedEmail = String(body.email ?? "").trim().toLowerCase().slice(0, 200);

  if (message.length < 4) {
    return NextResponse.json({ error: "Tell us a little more so we can act on it." }, { status: 400 });
  }
  if (typedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typedEmail)) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }

  // Signed in? Attach who they are, so we can follow up without asking.
  let userId: string | null = null;
  let userEmail: string | null = null;
  let userName: string | null = null;
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      userEmail = user.email ?? null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      userName = (profile?.name as string | null) ?? null;
    }
  } catch {
    // Signed out, or cookies unavailable. Feedback still goes through.
  }

  const replyTo = typedEmail || userEmail || undefined;

  try {
    const admin = supabaseAdmin();
    const { error } = await admin.from("feedback").insert({
      kind,
      message,
      page,
      email: replyTo ?? null,
      user_id: userId,
      name: userName,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error("feedback insert failed:", e);
    return NextResponse.json(
      { error: "We could not send that just now. Please try again in a minute." },
      { status: 500 }
    );
  }

  const who = userName || userEmail || typedEmail || "Someone signed out";

  // Fails soft: the note is already saved even if the email does not go out.
  await sendAdvisorEmail({
    subject: `[FEEDBACK] ${KIND_LABEL[kind]} from ${who}`,
    heading: `${KIND_LABEL[kind]}`,
    body: `${esc(who)} left this on <b>${esc(page || "the site")}</b>.`,
    extraHtml: `<div style="border-left:3px solid #B08A3E;background:#FCF7EA;padding:14px 18px;font-size:15px;line-height:1.65;color:#332E29;white-space:pre-wrap;">${esc(
      message
    )}</div>${
      replyTo
        ? `<p style="font-size:13px;color:#6B6259;margin-top:14px;">Reply to this email and it goes straight to ${esc(
            replyTo
          )}.</p>`
        : `<p style="font-size:13px;color:#6B6259;margin-top:14px;">No email left, so there is no way to reply to this one.</p>`
    }`,
    replyTo,
  });

  return NextResponse.json({ ok: true });
}
