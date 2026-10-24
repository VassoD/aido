export type AppErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "GEOCODING_FAILED"
  | "INVALID_INPUT"
  | "RATE_LIMIT_EXCEEDED"
  | "COUNTRY_NOT_SUPPORTED"
  | "AI_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

export class NetworkError extends AppError {
  readonly url: string;

  constructor(url: string, message: string, options?: { cause?: unknown; status?: number }) {
    super("PROVIDER_UNAVAILABLE", message, options?.status ?? 502, options);
    this.url = url;
  }
}

export class ProviderError extends AppError {
  readonly provider: string;

  constructor(provider: string, message: string, options?: { cause?: unknown }) {
    super("PROVIDER_UNAVAILABLE", message, 502, options);
    this.provider = provider;
  }
}

export class GeocodingError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("GEOCODING_FAILED", message, 422, options);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("INVALID_INPUT", message, 400, options);
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("RATE_LIMIT_EXCEEDED", "Too many requests", 429);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class CountryNotSupportedError extends AppError {
  constructor(countryCode: string) {
    super("COUNTRY_NOT_SUPPORTED", `Country ${countryCode} is not supported yet`, 400);
  }
}
