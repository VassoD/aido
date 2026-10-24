import type { z } from "zod";

import { NetworkError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRIES = 2;
const BASE_BACKOFF_MS = 300;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

interface FetchJsonOptions<TSchema extends z.ZodType> {
  schema: TSchema;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number): number {
  const jitter = Math.random() * BASE_BACKOFF_MS;
  return BASE_BACKOFF_MS * 2 ** attempt + jitter;
}

/**
 * GET a JSON resource with a timeout, exponential backoff on transient failures,
 * and runtime validation of the payload.
 */
export async function fetchJson<TSchema extends z.ZodType>(
  url: string,
  { schema, headers, timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, signal }: FetchJsonOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", ...headers },
        signal: combinedSignal,
      });

      if (!response.ok) {
        if (RETRYABLE_STATUSES.has(response.status) && attempt < retries) {
          lastError = new NetworkError(url, `HTTP ${response.status}`, { status: response.status });
          await sleep(backoffDelay(attempt));
          continue;
        }
        throw new NetworkError(url, `HTTP ${response.status}`, { status: response.status });
      }

      const json: unknown = await response.json();
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new NetworkError(url, "Unexpected response shape", { cause: parsed.error });
      }
      return parsed.data;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof NetworkError) throw error;

      lastError = error;
      if (attempt < retries) {
        logger.warn("http.retry", { url: redactUrl(url), attempt, error: String(error) });
        await sleep(backoffDelay(attempt));
        continue;
      }
    }
  }

  throw new NetworkError(url, "Request failed after retries", { cause: lastError });
}

function redactUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}
