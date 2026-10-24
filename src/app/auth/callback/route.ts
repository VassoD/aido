import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Only same-site paths, so the magic link cannot be turned into an open redirect. */
function safeNextPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

const EMAIL_OTP_TYPES = new Set<EmailOtpType>(["magiclink", "email", "signup", "invite", "recovery", "email_change"]);

/**
 * Two ways in: `code` (PKCE, the default magic link opened in the same browser) and
 * `token_hash` (works across browsers and devices, e.g. a link opened from a phone's mail app).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (code || (tokenHash && type && EMAIL_OTP_TYPES.has(type))) {
    const supabase = await createSupabaseServerClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash ?? "", type: type ?? "magiclink" });
    if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin));
    logger.warn("auth.callback_failed", { reason: error.message });
  }

  const failure = new URL(next, request.nextUrl.origin);
  failure.searchParams.set("auth_error", "1");
  return NextResponse.redirect(failure);
}
