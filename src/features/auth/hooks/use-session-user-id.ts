"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * The signed-in user's id in this browser, or null, for client-only UI such as the header and saved missions.
 * Sign-in always ends with a full page load, and SignOutButton emits SIGNED_OUT, so the auth event is enough.
 */
export function useSessionUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = createSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return userId;
}
