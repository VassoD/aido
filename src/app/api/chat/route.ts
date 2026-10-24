import { APICallError, createAgentUIStreamResponse } from "ai";
import { z } from "zod";

import { createMatchingAgent } from "@/features/matching/matching-agent";
import { SUPPORTED_COUNTRIES } from "@/features/missions/country-options";
import { LOCALES } from "@/i18n/routing";
import { AppError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { clientIp, RateLimiter } from "@/lib/rate-limit";

const MAX_MESSAGES = 40;
const MAX_REQUEST_BYTES = 400_000;
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 90_000;

const chatLimiter = new RateLimiter(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS);

const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1).max(MAX_MESSAGES),
  locale: z.enum(LOCALES),
  country: z.enum(SUPPORTED_COUNTRIES),
});

function errorResponse(error: AppError, requestId: string): Response {
  const headers: Record<string, string> = { "x-request-id": requestId };
  if (error.code === "RATE_LIMIT_EXCEEDED" && "retryAfterSeconds" in error) {
    headers["retry-after"] = String(error.retryAfterSeconds);
  }
  return Response.json(
    { error: { code: error.code, message: error.message, requestId } },
    { status: error.status, headers },
  );
}

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();

  try {
    chatLimiter.consume(clientIp(request));

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) throw new ValidationError("Conversation too long");

    const parsed = chatRequestSchema.safeParse(await request.json());
    if (!parsed.success) throw new ValidationError("Invalid chat request", { cause: parsed.error });

    const { messages, locale, country } = parsed.data;
    const agent = createMatchingAgent({ countryCode: country, locale });

    return await createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
      abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
      headers: { "x-request-id": requestId },
      onError: (error) => {
        logger.error("chat.stream_error", { requestId, country, locale, error: String(error) });
        if (error instanceof AppError) return error.code;
        if (APICallError.isInstance(error) || (error instanceof Error && error.name.startsWith("Gateway"))) {
          return "AI_UNAVAILABLE";
        }
        return "INTERNAL_ERROR";
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn("chat.request_rejected", { requestId, code: error.code });
      return errorResponse(error, requestId);
    }
    logger.error("chat.unhandled_error", { requestId, error: String(error) });
    return errorResponse(new AppError("INTERNAL_ERROR", "Something went wrong", 500), requestId);
  }
}
