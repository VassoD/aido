import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export type AppSupabaseClient = SupabaseClient<Database>;

/** Acts as the signed-in user (or anonymous visitor), so row level security applies. */
export async function createSupabaseServerClient(): Promise<AppSupabaseClient> {
  // Sessions are per request (and token checks read the clock), so never prerender past this point.
  await connection();
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot write cookies; the proxy refreshes sessions instead.
        }
      },
    },
  });
}

export interface SessionUser {
  id: string;
  email?: string;
}

export async function getSessionUser(supabase: AppSupabaseClient): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
}
