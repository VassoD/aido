import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import { causeSchema, commitmentSchema, type Mission } from "@/features/missions/mission";
import { logger } from "@/lib/logger";

const LINK_CHECK_TIMEOUT_MS = 5_000;
const MAX_REDIRECTS_STATUS = 399;
const DESCRIPTION_MAX_LENGTH = 600;

/** Platforms already connected through a provider adapter; web finds there would be duplicates. */
const CONNECTED_SOURCE_HOSTS = ["jeveuxaider.gouv.fr", "service-civique.gouv.fr", "api-engagement.beta.gouv.fr", "mana.bzh"];

export const webMissionInputSchema = z.object({
  url: z.string().url().describe("The page URL exactly as it appeared in web search results."),
  title: z.string().max(140).describe("What the volunteer would do, phrased like a mission title, in the page language."),
  organization: z.string().max(100).describe("Organization offering the opportunity."),
  city: z.string().max(80).optional().describe("Where it happens, if stated."),
  remote: z.boolean().optional().describe("True if it can be done from home."),
  commitment: commitmentSchema.describe("Best reading of the time asked. Use 'unknown' if the page does not say."),
  cause: causeSchema,
  summary: z.string().max(DESCRIPTION_MAX_LENGTH).describe("Two or three factual sentences from the page. No invented details."),
  reason: z.string().max(240).describe("One sentence on why this fits the person, in their language."),
  firstStep: z.string().max(140).optional(),
});

export type WebMissionInput = z.infer<typeof webMissionInputSchema>;

function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function isConnectedSource(host: string): boolean {
  return CONNECTED_SOURCE_HOSTS.some((connected) => host === connected || host.endsWith(`.${connected}`));
}

/** Confirms the page exists, so a hallucinated or dead link never becomes a card. */
async function linkResolves(url: string, signal?: AbortSignal): Promise<boolean> {
  const timeout = AbortSignal.timeout(LINK_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "AidoLinkCheck/1.0 (+volunteer matching)" },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    await response.body?.cancel();
    // Some sites refuse automated requests (403/429) while working fine in a browser.
    return response.status <= MAX_REDIRECTS_STATUS || response.status === 403 || response.status === 429;
  } catch {
    return false;
  }
}

function toMission(input: WebMissionInput, countryCode: string): Mission {
  const host = hostOf(input.url);
  const sourceId = createHash("sha256").update(input.url).digest("hex").slice(0, 16);
  return {
    id: `web:${sourceId}`,
    provider: "web",
    sourceId,
    title: input.title,
    description: input.summary,
    language: "",
    organizationName: input.organization,
    applyUrl: input.url,
    locationMode: input.remote ? "remote" : "onsite",
    location: input.city ? { city: input.city, countryCode } : null,
    commitment: input.commitment,
    engagementType: "volunteering",
    causes: [input.cause],
    skillsBased: false,
    skills: [],
    attribution: { publishedOn: host, via: "web" },
  };
}

export interface VerifiedWebMission {
  mission: Mission;
  reason: string;
  firstStep?: string;
}

export async function verifyWebMissions(
  inputs: WebMissionInput[],
  countryCode: string,
  signal?: AbortSignal,
): Promise<VerifiedWebMission[]> {
  const seenUrls = new Set<string>();
  const candidates = inputs.filter((input) => {
    if (seenUrls.has(input.url)) return false;
    seenUrls.add(input.url);
    return !isConnectedSource(hostOf(input.url));
  });

  const checks = await Promise.all(candidates.map((input) => linkResolves(input.url, signal)));
  const dropped = candidates.filter((_, index) => !checks[index]).map((input) => hostOf(input.url));
  if (dropped.length) logger.warn("web_missions.dropped_unreachable", { hosts: dropped });

  return candidates
    .filter((_, index) => checks[index])
    .map((input) => ({ mission: toMission(input, countryCode), reason: input.reason, firstStep: input.firstStep }));
}
