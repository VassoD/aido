import { z } from "zod";

/**
 * Aido's own cause taxonomy. Every provider adapter maps its native categories
 * onto these values so matching logic stays country-agnostic.
 */
export const CAUSES = [
  "solidarity",
  "education",
  "health",
  "environment",
  "animals",
  "culture",
  "sport",
  "digital",
  "humanitarian",
  "citizenship",
  "emergency",
  "employment",
  "research",
  "other",
] as const;
export const causeSchema = z.enum(CAUSES);
export type Cause = z.infer<typeof causeSchema>;

export const COMMITMENTS = ["one-off", "short-term", "long-term", "ongoing", "unknown"] as const;
export const commitmentSchema = z.enum(COMMITMENTS);
export type Commitment = z.infer<typeof commitmentSchema>;

export const LOCATION_MODES = ["onsite", "remote", "hybrid"] as const;
export type LocationMode = (typeof LOCATION_MODES)[number];

export const ENGAGEMENT_TYPES = ["volunteering", "civic-service", "other"] as const;
export const engagementTypeSchema = z.enum(ENGAGEMENT_TYPES);
export type EngagementType = z.infer<typeof engagementTypeSchema>;

export interface MissionLocation {
  city?: string;
  postalCode?: string;
  region?: string;
  /** Intermediate administrative area, e.g. a French département code. */
  adminAreaCode?: string;
  countryCode: string;
  lat?: number;
  lon?: number;
}

export interface MissionAttribution {
  /** Platform the mission was published on, e.g. "JeVeuxAider.gouv.fr". */
  publishedOn?: string;
  /** Data source Aido fetched it from, e.g. "API Engagement". */
  via: string;
  licence?: string;
}

export interface Mission {
  /** Globally unique: `${provider}:${sourceId}`. */
  id: string;
  provider: string;
  sourceId: string;
  title: string;
  description: string;
  language: string;
  organizationName: string;
  /** Provider-supplied URL. Must never be rewritten: some providers track applications through it. */
  applyUrl: string;
  locationMode: LocationMode;
  location: MissionLocation | null;
  startDate?: string;
  endDate?: string;
  durationHours?: number;
  scheduleText?: string;
  commitment: Commitment;
  engagementType: EngagementType;
  causes: Cause[];
  skillsBased: boolean;
  skills: string[];
  openToMinors?: boolean;
  reducedMobilityAccessible?: boolean;
  places?: number;
  attribution: MissionAttribution;
  /** Set for missions posted on Aido itself: volunteers apply in the app instead of on an external site. */
  inApp?: {
    organizationId: string;
    organizationVerified: boolean;
    questions: { id: string; label: string; kind: "short" | "long" | "yes_no" }[];
  };
}

const DAY_MS = 86_400_000;
const ONE_OFF_MAX_DAYS = 3;
const SHORT_TERM_MAX_DAYS = 60;

export function deriveCommitment(
  engagementType: EngagementType,
  startDate: string | undefined,
  endDate: string | undefined,
): Commitment {
  if (engagementType === "civic-service") return "long-term";
  if (!startDate || !endDate) return "ongoing";

  const spanDays = (Date.parse(endDate) - Date.parse(startDate)) / DAY_MS;
  if (Number.isNaN(spanDays)) return "ongoing";
  if (spanDays <= ONE_OFF_MAX_DAYS) return "one-off";
  if (spanDays <= SHORT_TERM_MAX_DAYS) return "short-term";
  return "long-term";
}

const REMOTE_PATTERN = /\b(à distance|en ligne|distanciel|télétravail|remote|online|from home)\b/i;

export function looksRemote(text: string): boolean {
  return REMOTE_PATTERN.test(text);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function isExpired(mission: Mission, now: Date = new Date()): boolean {
  return mission.endDate !== undefined && Date.parse(mission.endDate) < now.getTime();
}
