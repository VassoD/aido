import "server-only";

import { signInEmail } from "@/features/notifications/email-templates";
import { isAppLocale, routing, type AppLocale } from "@/i18n/routing";
import { sendEmail } from "@/lib/email/brevo";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

interface SignInLinkInput {
  email: string;
  nextPath: string;
  origin: string;
}

const LOCAL_DEVELOPMENT_ORIGIN = "http://localhost:3000";

/**
 * The link carries a sign-in token, so it may only point at Aido itself, never at a host taken from a
 * spoofable header. Supabase's redirect allow list used to play this role.
 */
function isTrustedOrigin(origin: string): boolean {
  const trusted = [
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.NODE_ENV === "development" ? LOCAL_DEVELOPMENT_ORIGIN : undefined,
  ];
  return trusted.includes(origin);
}

function localeOf(nextPath: string): AppLocale {
  const segment = nextPath.split("/")[1];
  return isAppLocale(segment) ? segment : routing.defaultLocale;
}

/** Hashed token for a one-time sign-in link, creating the account on first sign-in like signInWithOtp does. */
async function createSignInToken(email: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const existing = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (!existing.error) return existing.data.properties.hashed_token;

  // Confirming the address up front is safe: the account only opens through the link sent to that inbox.
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) {
    logger.warn("auth.sign_in_user_create_failed", { code: created.error.code, status: created.error.status });
    return null;
  }
  const fresh = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (fresh.error) {
    logger.warn("auth.sign_in_link_failed", { code: fresh.error.code, status: fresh.error.status });
    return null;
  }
  return fresh.data.properties.hashed_token;
}

/**
 * Sends the sign-in link through Brevo instead of Supabase's built-in sender, which allows only a
 * couple of emails per hour and only to the project's team. The token_hash link also works when it
 * is opened in another browser or on a phone, unlike the default PKCE link.
 * Returns false when Brevo is not configured or the email could not be sent, so the caller can fall back.
 */
export async function sendSignInLinkWithBrevo({ email, nextPath, origin }: SignInLinkInput): Promise<boolean> {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) return false;
  if (!isTrustedOrigin(origin)) {
    logger.warn("auth.sign_in_untrusted_origin", { origin });
    return false;
  }

  try {
    const hashedToken = await createSignInToken(email);
    if (!hashedToken) return false;

    const signInUrl = new URL("/auth/callback", origin);
    signInUrl.searchParams.set("token_hash", hashedToken);
    signInUrl.searchParams.set("type", "magiclink");
    signInUrl.searchParams.set("next", nextPath);

    return await sendEmail({
      to: { email },
      tag: "sign-in",
      ...signInEmail({ signInUrl: signInUrl.toString(), locale: localeOf(nextPath) }),
    });
  } catch (error) {
    logger.warn("auth.sign_in_email_failed", { error: String(error) });
    return false;
  }
}
