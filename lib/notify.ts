/** Server-only: sends branded group emails through Resend. */

const FROM = "Groups by Gatherwell <hello@groupsbygatherwell.com>";

function emailHtml(heading: string, body: string, ctaUrl: string, ctaText: string, extraHtml?: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F3EA;padding:40px 16px;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
      <tr><td align="center" style="padding-bottom:24px;">
        <div style="font-size:26px;color:#332E29;">Groups <span style="color:#B4531A;">by Gatherwell</span></div>
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#B08A3E;margin-top:4px;">GROUP TRAVEL, SOLVED</div>
      </td></tr>
      <tr><td style="background-color:#FFFFFF;border:1px solid #E3DACA;border-radius:14px;padding:36px 32px;">
        <div style="font-size:22px;color:#332E29;margin-bottom:12px;">${heading}</div>
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6B6259;margin-bottom:28px;">${body}</div>
        ${extraHtml ? `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6B6259;margin-bottom:28px;">${extraHtml}</div>` : ""}
        <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 8px;">
          <tr><td style="background-color:#B4531A;border-radius:999px;">
            <a href="${ctaUrl}" style="display:inline-block;padding:14px 34px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;">${ctaText}</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding-top:24px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#6B6259;line-height:1.6;">
        You're getting this because you're part of a trip on Groups by Gatherwell.<br>
        Questions? A human answers at <a href="mailto:hello@gatherwelltravel.com" style="color:#B08A3E;">hello@gatherwelltravel.com</a><br>
        <a href="https://www.groupsbygatherwell.com" style="color:#B08A3E;">www.groupsbygatherwell.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

/** Sends fully personalized emails (one per recipient, each with its own content). Fails soft. */
export async function sendPersonalEmails(
  messages: { to: string; subject: string; heading: string; body: string; extraHtml?: string; ctaUrl: string; ctaText: string }[]
) {
  const key = process.env.RESEND_API_KEY;
  if (!key || messages.length === 0) return false;
  const batch = messages.slice(0, 100).map((m) => ({
    from: FROM,
    to: [m.to],
    subject: m.subject,
    html: emailHtml(m.heading, m.body, m.ctaUrl, m.ctaText, m.extraHtml),
  }));
  try {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) console.error("resend personal batch failed:", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("resend personal batch error:", e);
    return false;
  }
}

/** High-priority email to the Gatherwell advisory inbox (concierge questions, leads). */
export async function sendAdvisorEmail(opts: { subject: string; heading: string; body: string; extraHtml?: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: ["hello@gatherwelltravel.com"],
        reply_to: opts.replyTo,
        subject: opts.subject,
        headers: { "X-Priority": "1", Importance: "high" },
        html: emailHtml(opts.heading, opts.body, "https://www.groupsbygatherwell.com/app", "Open the dashboard", opts.extraHtml),
      }),
    });
    if (!res.ok) console.error("advisor email failed:", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("advisor email error:", e);
    return false;
  }
}

/** Sends one email per recipient via Resend's batch endpoint. Fails soft: returns false, never throws. */
export async function sendGroupEmail(opts: {
  to: string[];
  subject: string;
  heading: string;
  body: string;
  ctaUrl: string;
  ctaText: string;
  extraHtml?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key || opts.to.length === 0) return false;
  const html = emailHtml(opts.heading, opts.body, opts.ctaUrl, opts.ctaText, opts.extraHtml);
  const batch = opts.to.slice(0, 100).map((to) => ({
    from: FROM,
    to: [to],
    subject: opts.subject,
    html,
  }));
  try {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) console.error("resend batch failed:", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("resend batch error:", e);
    return false;
  }
}
