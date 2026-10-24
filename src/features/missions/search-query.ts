import { z } from "zod";

import { causeSchema, engagementTypeSchema } from "@/features/missions/mission";

export const DEFAULT_RADIUS_KM = 20;
const MAX_RADIUS_KM = 200;

/**
 * Country-agnostic description of what a volunteer is looking for.
 * It doubles as the tool input the AI fills in and as the profile shown to the user.
 */
export const missionSearchQuerySchema = z.object({
  location: z
    .string()
    .max(120)
    .optional()
    .describe("Where the person can volunteer: city, district or postal code, as they said it. Omit if remote only."),
  radiusKm: z.number().int().min(1).max(MAX_RADIUS_KM).optional().describe(`Search radius in km. Default ${DEFAULT_RADIUS_KM}.`),
  locationMode: z
    .enum(["onsite", "remote", "any"])
    .optional()
    .describe("onsite: in person only. remote: from home only. any: both. Default any."),
  causes: z.array(causeSchema).max(5).optional().describe("Causes the person cares about. Omit if open to anything."),
  skills: z
    .array(z.string().max(40))
    .max(6)
    .optional()
    .describe("Skills or talents they want to use, short keywords in the mission language (e.g. 'comptabilité', 'graphisme', 'cuisine')."),
  interests: z
    .array(z.string().max(40))
    .max(6)
    .optional()
    .describe("Activities they would enjoy, short keywords in the mission language (e.g. 'enfants', 'jardinage', 'personnes âgées')."),
  availability: z
    .string()
    .max(80)
    .optional()
    .describe("Their availability in their own words, e.g. 'Saturday mornings, 2h a week'. Used for ranking and display."),
  maxCommitment: z
    .enum(["one-off", "short-term", "any"])
    .optional()
    .describe("one-off: a single action. short-term: up to about two months. any: no limit."),
  engagementTypes: z
    .array(engagementTypeSchema)
    .optional()
    .describe("Restrict to volunteering or civic service (16-25 year olds, paid stipend). Omit for any."),
  isMinor: z.boolean().optional().describe("True if the person is under 18."),
  needsAccessibility: z.boolean().optional().describe("True if they need missions accessible to people with reduced mobility."),
});

export type MissionSearchQuery = z.infer<typeof missionSearchQuerySchema>;
