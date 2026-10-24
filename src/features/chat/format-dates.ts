import type { Commitment } from "@/features/missions/mission";

export type DateRangeKind =
  | { kind: "single"; date: string }
  | { kind: "range"; start: string; end: string }
  | { kind: "from"; date: string }
  | { kind: "until"; date: string }
  | { kind: "none" };

function sameDay(left: Date, right: Date): boolean {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

/** Describes a mission's dates for display, hiding start dates that are already in the past. */
export function describeDates(
  startDate: string | undefined,
  endDate: string | undefined,
  locale: string,
  now: Date = new Date(),
): DateRangeKind {
  const format = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: undefined, timeZone: "UTC" });
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;
  const upcomingStart = start && start > now ? start : undefined;

  if (start && end && sameDay(start, end)) return { kind: "single", date: format.format(start) };
  if (upcomingStart && end) return { kind: "range", start: format.format(upcomingStart), end: format.format(end) };
  if (upcomingStart) return { kind: "from", date: format.format(upcomingStart) };
  if (end) return { kind: "until", date: format.format(end) };
  return { kind: "none" };
}

export const COMMITMENT_LEVEL: Record<Commitment, number> = {
  "one-off": 1,
  "short-term": 2,
  ongoing: 2,
  "long-term": 3,
  unknown: 0,
};

export const COMMITMENT_SCALE_STEPS = 3;
