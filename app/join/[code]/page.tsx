import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import JoinButton from "./JoinButton";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link className="logo" href="/">Groups <b>by Gatherwell</b><small>Group Travel, Solved</small></Link>
        </div>
      </nav>
      <section className="waitlist" style={{ minHeight: "70vh" }}>
        <div className="wrap center">
          <div className="eyebrow">You&apos;re invited</div>
          <h2 className="sec-title">Join your group&apos;s trip</h2>
          <p className="sec-sub">
            Someone is planning a group trip and wants you in on the decisions: dates, budget,
            destination, and more. Joining is free for travelers.
          </p>
          {user ? (
            <JoinButton code={code} />
          ) : (
            <p style={{ marginTop: 26 }}>
              <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(`/join/${code}`)}`}>
                Sign in to join
              </Link>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
