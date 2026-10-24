"use server";

import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { RateLimiter } from "@/lib/rate-limit";
import { requestIp, requestOrigin } from "@/lib/request-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAGIC_LINK_LIMIT = 5;
const MAGIC_LINK_WINDOW_MS = 15 * 60 * 1000;
const magicLinkLimiter = new RateLimiter(MAGIC_LINK_LIMIT, MAGIC_LINK_WINDOW_MS);

const magicLinkSchema = z.object({
  email: z.email().max(320),
  nextPath: z.string().startsWith("/").max(300).refine((path) => !path.startsWith("//")),
});

export async function sendMagicLinkAction(input: z.infer<typeof magicLinkSchema>): Promise<ActionResult<null>> {
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT");

  try {
    magicLinkLimiter.consume(await requestIp());
  } catch {
    return fail("RATE_LIMIT_EXCEEDED");
  }

  const origin = await requestOrigin();
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", parsed.data.nextPath);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
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
