import type { AppErrorCode } from "@/lib/errors";

export type ActionErrorCode = AppErrorCode | "AUTH_REQUIRED" | "NOT_FOUND" | "CONFLICT";

export type ActionResult<TData> = { ok: true; data: TData } | { ok: false; error: ActionErrorCode };

export const ok = <TData>(data: TData): ActionResult<TData> => ({ ok: true, data });
export const fail = <TData = never>(error: ActionErrorCode): ActionResult<TData> => ({ ok: false, error });
