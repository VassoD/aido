import "server-only";

import { logger } from "@/lib/logger";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";
const SEND_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 800;
const DEFAULT_SENDER_NAME = "Aido";

export interface EmailMessage {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  /** Lets the recipient reply straight to the other person instead of to Aido. */
  replyTo?: { email: string; name?: string };
  /** Groups messages in Brevo's logs, e.g. "new-application". */
  tag: string;
}

/**
 * Sends one transactional email through Brevo. Never throws: a notification that fails must not
 * break the action that triggered it. Without BREVO_API_KEY (local development) it only logs.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    logger.info("email.skipped_not_configured", { tag: message.tag });
    return false;
  }

  const body = JSON.stringify({
    sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME ?? DEFAULT_SENDER_NAME },
    to: [message.to],
    replyTo: message.replyTo,
    subject: message.subject,
    htmlContent: message.html,
    textContent: message.text,
    tags: [message.tag],
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(BREVO_SEND_URL, {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
        body,
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (response.ok) {
        logger.info("email.sent", { tag: message.tag });
        return true;
      }
      const retryable = response.status === 429 || response.status >= 500;
      logger.warn("email.rejected", { tag: message.tag, status: response.status, attempt });
      if (!retryable) return false;
    } catch (error) {
      logger.warn("email.failed", { tag: message.tag, attempt, error: String(error) });
    }
    if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
  }
  return false;
}
