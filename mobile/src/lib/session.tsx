import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type SessionState = {
  session: Session | null;
  userId: string | null;
  email: string | null;
  /** False until the stored session has been read back from disk. */
  ready: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState>({
  session: null,
  userId: null,
  email: null,
  ready: false,
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      session,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
      ready,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
