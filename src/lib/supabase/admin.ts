import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { AppSupabaseClient } from "@/lib/supabase/server";
import { supabaseUrl } from "@/lib/supabase/env";

let adminClient: AppSupabaseClient | null = null;

/**
 * Bypasses row level security. Only for writes the server must vouch for (register-verified
 * organizations, AI fit summaries) and cross-association reads such as volunteer badge counts.
 */
export function getSupabaseAdmin(): AppSupabaseClient {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing environment variable SUPABASE_SECRET_KEY");
  adminClient ??= createClient(supabaseUrl(), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
