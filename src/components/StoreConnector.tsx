"use client";

import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";
import { connect, disconnect } from "@/lib/store";

/**
 * Connects the store to Supabase as the signed-in person. Every request carries
 * their Clerk session token, which Supabase checks (third-party auth) before
 * row-level security picks their rows. Signing out clears what was loaded.
 */
export function StoreConnector() {
  const { isLoaded, session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (!isLoaded) return;
    if (!session || !userId) {
      disconnect();
      return;
    }
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      accessToken: async () => (await session.getToken()) ?? null,
    });
    connect(client, userId);
    // A new client only when the person changes, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId]);

  return null;
}
