import { z } from "zod";

import { deriveCommitment, stripHtml, type LocationMode, type Mission } from "@/features/missions/mission";
import type { MissionProvider, ProviderSearchParams } from "@/features/missions/provider";
import {
  causesToDomains,
  engagementToTypes,
  inferCauses,
  isSkillsBasedDomain,
  SKILLS_BASED_DOMAIN_LIST,
  typeToEngagement,
} from "@/features/missions/providers/fr-taxonomy";
import { NetworkError, ProviderError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";
import { TtlCache } from "@/lib/ttl-cache";

const API_ENGAGEMENT_BASE_URL = "https://api.api-engagement.beta.gouv.fr";
const PAGE_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;
const MAX_KEYWORD_QUERIES = 2;

const looseBoolean = z
  .union([z.boolean(), z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === true || value === "true" || value === "yes") return true;
    if (value === false || value === "false" || value === "no") return false;
    return undefined;
  });

const addressSchema = z.looseObject({
  postalCode: z.string().nullish(),
  city: z.string().nullish(),
  departmentCode: z.string().nullish(),
  region: z.string().nullish(),
  country: z.string().nullish(),
  location: z.object({ lat: z.number(), lon: z.number() }).nullish(),
});

const apiEngagementMissionSchema = z.looseObject({
  _id: z.string().optional(),
  id: z.string().optional(),
  title: z.string(),
  description: z.string().nullish(),
  applicationUrl: z.string(),
  domain: z.string().nullish(),
  activities: z.array(z.string()).nullish(),
  softSkills: z.array(z.string()).nullish(),
  remote: z.string().nullish(),
  schedule: z.string().nullish(),
  startAt: z.string().nullish(),
  endAt: z.string().nullish(),
  duration: z.number().nullish(),
  places: z.number().nullish(),
  type: z.string().nullish(),
  openToMinors: looseBoolean,
  reducedMobilityAccessible: looseBoolean,
  organizationName: z.string().nullish(),
  publisherName: z.string().nullish(),
  addresses: z.array(addressSchema).nullish(),
});

type ApiEngagementMission = z.infer<typeof apiEngagementMissionSchema>;

const listResponseSchema = z.object({ data: z.array(apiEngagementMissionSchema) });
const detailResponseSchema = z.object({ data: apiEngagementMissionSchema });

const COUNTRY_NAME_TO_CODE: Record<string, string> = { France: "FR" };

function toLocationMode(remote: string | null | undefined): LocationMode {
  if (remote === "full") return "remote";
  if (remote === "possible") return "hybrid";
  return "onsite";
}

function toMission(raw: ApiEngagementMission): Mission {
  const sourceId = raw.id ?? raw._id ?? raw.applicationUrl;
  const engagementType = typeToEngagement(raw.type);
  const address = raw.addresses?.[0];
  const startDate = raw.startAt ?? undefined;
  const endDate = raw.endAt ?? undefined;

  return {
    id: `api-engagement:${sourceId}`,
    provider: "api-engagement",
    sourceId,
    title: raw.title,
    description: stripHtml(raw.description ?? ""),
    language: "fr",
    organizationName: raw.organizationName ?? "",
    applyUrl: raw.applicationUrl,
    locationMode: toLocationMode(raw.remote),
    location: address
      ? {
          city: address.city ?? undefined,
          postalCode: address.postalCode ?? undefined,
          region: address.region ?? undefined,
          adminAreaCode: address.departmentCode ?? undefined,
          countryCode: (address.country && COUNTRY_NAME_TO_CODE[address.country]) || "FR",
          lat: address.location?.lat,
          lon: address.location?.lon,
        }
      : null,
    startDate,
    endDate,
    durationHours: raw.duration ?? undefined,
    scheduleText: raw.schedule ?? undefined,
    commitment: deriveCommitment(engagementType, startDate, endDate),
    engagementType,
    causes: inferCauses(raw.domain, raw.title),
    skillsBased: isSkillsBasedDomain(raw.domain),
    skills: [...(raw.activities ?? []), ...(raw.softSkills ?? [])],
    openToMinors: raw.openToMinors,
    reducedMobilityAccessible: raw.reducedMobilityAccessible,
    places: raw.places ?? undefined,
    attribution: { publishedOn: raw.publisherName ?? undefined, via: "API Engagement" },
  };
}

/**
 * Official French source: API Engagement (beta.gouv), which aggregates JeVeuxAider.gouv.fr,
 * Service Civique and partner platforms. Requires a free key requested from the API Engagement team.
 * Terms: users must apply through the tracked `applicationUrl`, and impressions must be reported.
 */
export class ApiEngagementProvider implements MissionProvider {
  readonly id = "api-engagement";
  readonly displayName = "API Engagement";
  readonly attributionLabel = "Missions JeVeuxAider.gouv.fr, Service Civique et partenaires, via API Engagement";
  readonly supportsRadiusSearch = true;

  private readonly cache = new TtlCache<Mission[]>(CACHE_MAX_ENTRIES, CACHE_TTL_MS);

  constructor(private readonly apiKey: string) {}

  async search({ query, place, radiusKm, signal }: ProviderSearchParams): Promise<Mission[]> {
    const base = new URLSearchParams({ limit: String(PAGE_SIZE) });

    if (query.locationMode === "remote") {
      base.append("remote", "full");
      base.append("remote", "possible");
    } else if (place) {
      base.set("lat", String(place.lat));
      base.set("lon", String(place.lon));
      base.set("distance", `${radiusKm}km`);
      if (query.locationMode === "onsite") base.append("remote", "no");
    }
    for (const type of engagementToTypes(query.engagementTypes ?? [])) base.append("type", type);
    if (query.isMinor) base.set("openToMinors", "yes");
    if (query.needsAccessibility) base.set("reducedMobilityAccessible", "yes");

    const byCategory = new URLSearchParams(base);
    const domains = causesToDomains(query.causes ?? []);
    if (query.skills?.length) domains.push(...SKILLS_BASED_DOMAIN_LIST);
    for (const domain of domains) byCategory.append("domain", domain);

    // Publishers categorize loosely, so keyword queries catch missions filed under another domain.
    const byKeyword = [...(query.interests ?? []), ...(query.skills ?? [])]
      .slice(0, MAX_KEYWORD_QUERIES)
      .map((keyword) => new URLSearchParams([...base, ["keywords", keyword]]));

    const results = await Promise.allSettled([byCategory, ...byKeyword].map((params) => this.fetchList(params, signal)));
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    if (fulfilled.length === 0) {
      throw new ProviderError(this.id, "API Engagement search failed", {
        cause: results[0]?.status === "rejected" ? results[0].reason : undefined,
      });
    }

    const missions = new Map<string, Mission>();
    for (const result of fulfilled) for (const mission of result.value) missions.set(mission.id, mission);
    return [...missions.values()];
  }

  private async fetchList(params: URLSearchParams, signal?: AbortSignal): Promise<Mission[]> {
    params.sort();
    const url = `${API_ENGAGEMENT_BASE_URL}/v0/mission?${params}`;
    return this.cache.getOrLoad(url, async () => {
      const result = await fetchJson(url, { schema: listResponseSchema, headers: this.headers(), signal });
      return result.data.map(toMission);
    });
  }

  async getById(sourceId: string, signal?: AbortSignal): Promise<Mission | null> {
    try {
      const result = await fetchJson(`${API_ENGAGEMENT_BASE_URL}/v0/mission/${encodeURIComponent(sourceId)}`, {
        schema: detailResponseSchema,
        headers: this.headers(),
        signal,
        retries: 1,
      });
      return toMission(result.data);
    } catch (error) {
      if (error instanceof NetworkError && error.status === 404) return null;
      throw new ProviderError(this.id, "Could not fetch API Engagement mission", { cause: error });
    }
  }

  private headers(): Record<string, string> {
    return { "x-api-key": this.apiKey };
  }
}
