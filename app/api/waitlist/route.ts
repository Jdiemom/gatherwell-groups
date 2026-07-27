import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return Response.json(
      { error: "The waitlist isn't connected yet. Please try again later." },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const groupSize = String(body.group_size ?? "").slice(0, 20);
  const tripTiming = String(body.trip_timing ?? "").slice(0, 20);

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid name and email." }, { status: 400 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { error } = await supabase.from("waitlist").insert({
    name,
    email,
    group_size: groupSize,
    trip_timing: tripTiming,
  });

  if (error) {
    // 23505 = unique violation: they already signed up. Treat as success.
    if (error.code === "23505") {
      return Response.json({ ok: true, already: true });
    }
    console.error("waitlist insert failed:", error.message);
    return Response.json(
      { error: "We couldn't save that just now. Please try again in a minute." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
