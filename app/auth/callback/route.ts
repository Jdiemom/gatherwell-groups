import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") || "/app";

  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  // only allow same-site redirects
  const safe = nextPath.startsWith("/") ? nextPath : "/app";
  return NextResponse.redirect(new URL(safe, url.origin));
}
