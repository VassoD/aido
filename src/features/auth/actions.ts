"use server";

import { z } from "zod";

import { sendSignInLinkWithBrevo } from "@/features/auth/sign-in-email";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { RateLimiter } from "@/lib/rate-limit";
import { requestIp, requestOrigin } from "@/lib/request-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAGIC_LINK_LIMIT = 5;
const MAGIC_LINK_WINDOW_MS = 15 * 60 * 1000;
const MAGIC_LINK_PER_EMAIL_LIMIT = 3;
const magicLinkLimiter = new RateLimiter(MAGIC_LINK_LIMIT, MAGIC_LINK_WINDOW_MS);
const magicLinkPerEmailLimiter = new RateLimiter(MAGIC_LINK_PER_EMAIL_LIMIT, MAGIC_LINK_WINDOW_MS);

const magicLinkSchema = z.object({
  email: z.email().max(320),
  nextPath: z.string().startsWith("/").max(300).refine((path) => !path.startsWith("//")),
});

export async function sendMagicLinkAction(input: z.infer<typeof magicLinkSchema>): Promise<ActionResult<null>> {
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT");

  const email = parsed.data.email.trim().toLowerCase();
  try {
    magicLinkLimiter.consume(await requestIp());
    // Supabase no longer throttles these emails, so cap them per address to keep inboxes from being flooded.
    magicLinkPerEmailLimiter.consume(email);
  } catch {
    return fail("RATE_LIMIT_EXCEEDED");
  }

  const origin = await requestOrigin();
  if (await sendSignInLinkWithBrevo({ email, nextPath: parsed.data.nextPath, origin })) return ok(null);

  // Fallback: Supabase's built-in sender, limited to a few emails per hour and to the project's team.
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", parsed.data.nextPath);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });
  if (error) {
    logger.warn("auth.magic_link_failed", { status: error.status, code: error.code });
    return fail(error.status === 429 ? "RATE_LIMIT_EXCEEDED" : "INTERNAL_ERROR");
  }
  return ok(null);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
