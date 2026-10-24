import "server-only";

import type { GeoPlace } from "@/features/geo/geocoder";
import { getInAppMission, searchInAppMissions } from "@/features/missions/aido-missions";
import { getCountryRuntime } from "@/features/missions/countries";
import { isExpired, type Mission } from "@/features/missions/mission";
import { distanceKm, scoreMission } from "@/features/missions/ranking";
import { DEFAULT_RADIUS_KM, type MissionSearchQuery } from "@/features/missions/search-query";
import { TtlCache } from "@/lib/ttl-cache";

const MAX_CANDIDATES = 25;
/** Missions posted on Aido skip the external site and PDF forms, so they lead when relevant. */
const IN_APP_BOOST = 4;
const SNIPPET_LENGTH = 320;
const MISSION_CACHE_TTL_MS = 60 * 60 * 1000;
const MISSION_CACHE_MAX_ENTRIES = 5_000;

/** Missions seen in recent searches, so recommendations can be rendered without refetching. */
const missionCache = new TtlCache<Mission>(MISSION_CACHE_MAX_ENTRIES, MISSION_CACHE_TTL_MS);

/** What the model sees for each candidate: enough to judge fit, small enough to keep context lean. */
export interface MissionCandidate {
  id: string;
  title: string;
  organization: string;
  place: string;
  locationMode: Mission["locationMode"];
  cause: string;
  skillsBased: boolean;
  engagementType: Mission["engagementType"];
  commitment: Mission["commitment"];
  startDate?: string;
  endDate?: string;
  durationHours?: number;
  schedule?: string;
  snippet: string;
  /** True when the person can apply directly in Aido. */
  applyInApp: boolean;
  /** The association's short application form, for in-app missions. */
  applicationQuestions?: { id: string; question: string; kind: string }[];
}

export type MissionSearchResult =
  | {
      status: "ok";
      resolvedLocation: string | null;
      radiusKm: number;
      totalFound: number;
      candidates: MissionCandidate[];
    }
  | { status: "location_not_found"; location: string };

function toCandidate(mission: Mission): MissionCandidate {
  const place = [mission.location?.city, mission.location?.postalCode].filter(Boolean).join(" ");
  return {
    id: mission.id,
    title: mission.title,
    organization: mission.organizationName,
    place,
    locationMode: mission.locationMode,
    cause: mission.causes.join(", "),
    skillsBased: mission.skillsBased,
    engagementType: mission.engagementType,
    commitment: mission.commitment,
    startDate: mission.startDate?.slice(0, 10),
    endDate: mission.endDate?.slice(0, 10),
    durationHours: mission.durationHours,
    schedule: mission.scheduleText,
    snippet: mission.description.slice(0, SNIPPET_LENGTH),
    applyInApp: mission.inApp !== undefined,
    applicationQuestions: mission.inApp?.questions.map(({ id, label, kind }) => ({ id, question: label, kind })),
  };
}

function matchesHardConstraints(mission: Mission, query: MissionSearchQuery, place: GeoPlace | null, radiusKm: number): boolean {
  if (isExpired(mission)) return false;
  if (query.isMinor && mission.openToMinors === false) return false;
  if (query.needsAccessibility && mission.reducedMobilityAccessible === false) return false;
  if (query.locationMode === "remote" && mission.locationMode === "onsite") return false;
  if (query.locationMode === "onsite" && mission.locationMode === "remote") return false;
  if (query.engagementTypes?.length && !query.engagementTypes.includes(mission.engagementType)) return false;
  if (query.maxCommitment === "one-off" && mission.commitment !== "one-off" && mission.commitment !== "short-term") {
    return false;
  }
  if (query.maxCommitment === "short-term" && mission.commitment === "long-term") return false;

  const coordinates = mission.location;
  if (place && coordinates?.lat !== undefined && coordinates.lon !== undefined && mission.locationMode !== "remote") {
    if (distanceKm(place, { lat: coordinates.lat, lon: coordinates.lon }) > radiusKm) return false;
  }
  return true;
}

export async function searchMissions(
  query: MissionSearchQuery,
  countryCode: string,
  signal?: AbortSignal,
): Promise<MissionSearchResult> {
  const country = getCountryRuntime(countryCode);
  const radiusKm = query.radiusKm ?? DEFAULT_RADIUS_KM;

  let place: GeoPlace | null = null;
  if (query.location && query.locationMode !== "remote") {
    place = await country.geocoder.geocode(query.location, signal);
    if (!place) return { status: "location_not_found", location: query.location };
  }

  const [inAppMissions, externalMissions] = await Promise.all([
    searchInAppMissions(query, country.code, place, radiusKm),
    country.provider.search({ query, place, radiusKm, signal }),
  ]);
  const eligible = [...inAppMissions, ...externalMissions].filter((mission) =>
    matchesHardConstraints(mission, query, place, radiusKm),
  );

  const ranked = eligible
    .map((mission) => ({
      mission,
      score: scoreMission(mission, query, place, radiusKm) + (mission.inApp ? IN_APP_BOOST : 0),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_CANDIDATES)
    .map(({ mission }) => mission);

  for (const mission of ranked) missionCache.set(mission.id, mission);

  return {
    status: "ok",
    resolvedLocation: place ? [place.label, place.adminAreaName].filter(Boolean).join(", ") : null,
    radiusKm,
    totalFound: eligible.length,
    candidates: ranked.map(toCandidate),
  };
}

export async function getMissionById(missionId: string, countryCode: string, signal?: AbortSignal): Promise<Mission | null> {
  const cached = missionCache.get(missionId);
  if (cached) return cached;

  if (missionId.startsWith("aido:")) return getInAppMission(missionId.slice("aido:".length));

  const country = getCountryRuntime(countryCode);
  const prefix = `${country.provider.id}:`;
  if (!missionId.startsWith(prefix)) return null;

  const mission = await country.provider.getById(missionId.slice(prefix.length), signal);
  if (mission) missionCache.set(mission.id, mission);
  return mission;
}

export function getProviderAttribution(countryCode: string): string {
  return getCountryRuntime(countryCode).provider.attributionLabel;
}
