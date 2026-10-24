import { RateLimitError } from "@/lib/errors";

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, in-memory rate limiter. Per instance only, so it is a first line of defense
 * against runaway AI spend; pair it with a Vercel Firewall rate-limit rule in production.
 */
export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  consume(key: string): void {
    const now = Date.now();
    const current = this.windows.get(key);

    if (!current || current.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      this.evictExpired(now);
      return;
    }

    if (current.count >= this.limit) {
      throw new RateLimitError(Math.ceil((current.resetAt - now) / 1000));
    }
    current.count++;
  }

  private evictExpired(now: number): void {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
