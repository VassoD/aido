type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function write(level: LogLevel, event: string, context: LogContext): void {
  const entry = JSON.stringify({ level, event, timestamp: new Date().toISOString(), ...context });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

/** Structured JSON logger. Never pass secrets or personal data in the context. */
export const logger = {
  info: (event: string, context: LogContext = {}): void => write("info", event, context),
  warn: (event: string, context: LogContext = {}): void => write("warn", event, context),
  error: (event: string, context: LogContext = {}): void => write("error", event, context),
};
