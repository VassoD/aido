import type { AppErrorCode } from "@/lib/errors";

const KNOWN_CODES: readonly AppErrorCode[] = [
  "PROVIDER_UNAVAILABLE",
  "GEOCODING_FAILED",
  "INVALID_INPUT",
  "AI_UNAVAILABLE",
  "RATE_LIMIT_EXCEEDED",
  "INTERNAL_ERROR",
];

function isKnownCode(value: unknown): value is AppErrorCode {
  return typeof value === "string" && (KNOWN_CODES as readonly string[]).includes(value);
}

/**
 * Chat errors reach the client either as a JSON error body (rejected request)
 * or as a bare code string (error during streaming). Both map to a translated message.
 */
export function chatErrorCode(error: Error): AppErrorCode {
  if (isKnownCode(error.message)) return error.message;
  try {
    const body: unknown = JSON.parse(error.message);
    const code = (body as { error?: { code?: unknown } })?.error?.code;
    if (isKnownCode(code)) return code;
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return "INTERNAL_ERROR";
}
