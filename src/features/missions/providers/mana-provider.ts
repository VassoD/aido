import { z } from "zod";

import { deriveCommitment, looksRemote, stripHtml, type Mission } from "@/features/missions/mission";
import type { MissionProvider, ProviderSearchParams } from "@/features/missions/provider";
import { departmentsNear } from "@/features/missions/providers/fr-departments";
import {
  causesToDomains,
  departmentFromPostalCode,
  engagementToTypes,
  inferCauses,
  isSkillsBasedDomain,
  SKILLS_BASED_DOMAIN_LIST,
  typeToEngagement,
} from "@/features/missions/providers/fr-taxonomy";
import { NetworkError, ProviderError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";
import { logger } from "@/lib/logger";
import { TtlCache } from "@/lib/ttl-cache";

const MANA_BASE_URL = "https://mana.bzh/api/public/v1";
const MANA_VOCAB = "https://mana.bzh/vocabulaire/v1/";
const PAGE_SIZE = 100;
/** MANA allows 60 requests per minute per IP, so each search fans out to a handful at most. */
const MAX_REQUESTS = 7;
const MAX_DEPARTMENTS_QUERIED = 2;
const MAX_DOMAINS_PER_DEPARTMENT = 2;
const MAX_KEYWORD_QUERIES = 3;
const MIN_KEYWORD_LENGTH = 3;
const REMOTE_KEYWORDS = ["distance", "en ligne"];
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;

const manaEventSchema = z.looseObject({
  identifier: z.string(),
  name: z.string(),
  description: z.string().optional(),
  inLanguage: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  duration: z.string().optional(),
  maximumAttendeeCapacity: z.number().optional(),
  url: z.string(),
  location: z
    .object({
      address: z
        .object({
          addressLocality: z.string().optional(),
          postalCode: z.string().optional(),
          addressRegion: z.string().optional(),
          addressCountry: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  organizer: z.object({ name: z.string() }).optional(),
});

type ManaEvent = z.infer<typeof manaEventSchema>;

const manaListSchema = z.object({
  itemListElement: z.array(z.object({ item: manaEventSchema })),
});

function vocab(event: ManaEvent, key: string): unknown {
  return (event as Record<string, unknown>)[`${MANA_VOCAB}${key}`];
}

function parseIsoHours(duration: string | undefined): number | undefined {
  const match = duration?.match(/^PT(\d+)H$/);
  return match ? Number(match[1]) : undefined;
}

function toMission(event: ManaEvent): Mission {
  const domain = vocab(event, "domaine") as string | undefined;
  const nature = vocab(event, "natureEngagement") as string | undefined;
  const publishedOn = (vocab(event, "relayeDepuis") as { name?: string } | undefined)?.name;
  const description = stripHtml(event.description ?? "");
  const engagementType = typeToEngagement(nature);
  const address = event.location?.address;
  const remote = looksRemote(`${event.name} ${description.slice(0, 400)}`);

  return {
    id: `mana:${event.identifier}`,
    provider: "mana",
    sourceId: event.identifier,
    title: event.name,
    description,
    language: event.inLanguage ?? "fr",
    organizationName: event.organizer?.name ?? "",
    applyUrl: event.url,
    locationMode: remote ? "hybrid" : "onsite",
    location: address
      ? {
          city: address.addressLocality,
          postalCode: address.postalCode,
          region: address.addressRegion,
          adminAreaCode: departmentFromPostalCode(address.postalCode),
          countryCode: address.addressCountry ?? "FR",
        }
      : null,
    startDate: event.startDate,
    endDate: event.endDate,
    durationHours: parseIsoHours(event.duration),
    commitment: deriveCommitment(engagementType, event.startDate, event.endDate),
    engagementType,
    causes: inferCauses(domain, event.name),
    skillsBased: isSkillsBasedDomain(domain),
    skills: [],
    openToMinors: vocab(event, "ouvertAuxMineurs") as boolean | undefined,
    reducedMobilityAccessible: vocab(event, "accessibleMobiliteReduite") as boolean | undefined,
    places: event.maximumAttendeeCapacity,
    attribution: { publishedOn, via: "MANA (relais API Engagement)", licence: "Licence Ouverte 2.0" },
  };
}

/**
 * Development data source: MANA's open, unofficial relay of API Engagement missions.
 * It filters by département only (no radius, no remote flag) and searches titles only, so each
 * search combines category queries in nearby départements with nationwide title keyword queries,
 * then keeps missions in départements within reach. Replace with API Engagement in production.
 */
export class ManaProvider implements MissionProvider {
  readonly id = "mana";
  readonly displayName = "MANA";
  readonly attributionLabel = "Missions JeVeuxAider.gouv.fr et Service Civique, relayées par MANA (données de développement)";
  readonly supportsRadiusSearch = false;

  private readonly cache = new TtlCache<Mission[]>(CACHE_MAX_ENTRIES, CACHE_TTL_MS);

  async search({ query, place, radiusKm, signal }: ProviderSearchParams): Promise<Mission[]> {
    const reachableDepartments = place ? departmentsNear(place, radiusKm) : null;
    const requests = this.buildRequests(query, reachableDepartments ?? []);
    const results = await Promise.allSettled(requests.map((params) => this.fetchList(params, signal)));

    const missions = new Map<string, Mission>();
    let failures = 0;
    for (const result of results) {
      if (result.status === "rejected") {
        failures++;
        logger.warn("mana.search.partial_failure", { error: String(result.reason) });
        continue;
      }
      for (const mission of result.value) missions.set(mission.id, mission);
    }
    if (failures === results.length) {
      throw new ProviderError(this.id, "All MANA requests failed");
    }

    const allowed = reachableDepartments && query.locationMode !== "remote" ? new Set(reachableDepartments) : null;
    return [...missions.values()].filter((mission) => {
      if (!allowed) return true;
      const department = mission.location?.adminAreaCode;
      return department ? allowed.has(department) : mission.locationMode !== "onsite";
    });
  }

  async getById(sourceId: string, signal?: AbortSignal): Promise<Mission | null> {
    try {
      const event = await fetchJson(`${MANA_BASE_URL}/mission/${encodeURIComponent(sourceId)}`, {
        schema: manaEventSchema,
        signal,
        retries: 1,
      });
      return toMission(event);
    } catch (error) {
      if (error instanceof NetworkError && error.status === 404) return null;
      throw new ProviderError(this.id, "Could not fetch MANA mission", { cause: error });
    }
  }

  private buildRequests(query: ProviderSearchParams["query"], departments: readonly string[]): URLSearchParams[] {
    const base = new URLSearchParams({ limite: String(PAGE_SIZE) });
    const types = engagementToTypes(query.engagementTypes ?? []);
    if (types.length === 1) base.set("nature", types[0]);
    const withParams = (...entries: [string, string][]): URLSearchParams => new URLSearchParams([...base, ...entries]);

    // Title search is nationwide; results are narrowed to reachable départements afterwards.
    const keywordRequests = [...(query.interests ?? []), ...(query.skills ?? [])]
      .map(titleSearchTerm)
      .filter((term) => term.length >= MIN_KEYWORD_LENGTH)
      .slice(0, MAX_KEYWORD_QUERIES)
      .map((term) => withParams(["q", term]));

    if (query.locationMode === "remote") {
      return [...REMOTE_KEYWORDS.map((keyword) => withParams(["q", keyword])), ...keywordRequests].slice(0, MAX_REQUESTS);
    }

    const domains = causesToDomains(query.causes ?? []);
    if (query.skills?.length) domains.push(...SKILLS_BASED_DOMAIN_LIST.slice(0, 1));
    const domainFilters: ([string, string] | null)[] = domains.length
      ? domains.slice(0, MAX_DOMAINS_PER_DEPARTMENT).map((domain): [string, string] => ["domaine", domain])
      : [null];

    const departmentRequests = departments.slice(0, MAX_DEPARTMENTS_QUERIED).flatMap((department) =>
      domainFilters.map((filter) =>
        filter ? withParams(["departement", department], filter) : withParams(["departement", department]),
      ),
    );

    // Interleave so the cap never drops a whole kind of query.
    const requests: URLSearchParams[] = [];
    for (let index = 0; index < Math.max(departmentRequests.length, keywordRequests.length); index++) {
      if (departmentRequests[index]) requests.push(departmentRequests[index]);
      if (keywordRequests[index]) requests.push(keywordRequests[index]);
    }
    return requests.slice(0, MAX_REQUESTS);
  }

  private async fetchList(params: URLSearchParams, signal?: AbortSignal): Promise<Mission[]> {
    params.sort();
    const url = `${MANA_BASE_URL}/missions?${params}`;
    return this.cache.getOrLoad(url, async () => {
      const result = await fetchJson(url, { schema: manaListSchema, signal });
      return result.itemListElement.map(({ item }) => toMission(item));
    });
  }
}

/**
 * MANA matches titles literally, and titles mix straight and curly apostrophes
 * ("famille d'accueil" vs "famille d’accueil"), so search the longest apostrophe-free fragment.
 */
function titleSearchTerm(keyword: string): string {
  const fragments = keyword.trim().split(/['’]/);
  return fragments.reduce((longest, fragment) => (fragment.trim().length > longest.length ? fragment.trim() : longest), "");
}
