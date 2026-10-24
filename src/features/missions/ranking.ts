import type { GeoPlace } from "@/features/geo/geocoder";
import type { Mission } from "@/features/missions/mission";
import type { MissionSearchQuery } from "@/features/missions/search-query";

const WEIGHTS = {
  causeMatch: 3,
  keywordInTitle: 2,
  keywordInDescription: 1,
  skillsBasedForSkilledPerson: 2,
  samePostalCode: 2,
  sameCity: 1.5,
  sameAdminArea: 0.5,
  proximityMax: 3,
  commitmentExact: 2,
  commitmentClose: 1,
} as const;

const EARTH_RADIUS_KM = 6371;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’`]/g, "'")
    .toLowerCase();
}

export function distanceKm(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
  const toRad = (degrees: number): number => (degrees * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function cityStem(city: string | undefined): string {
  // "Lyon 7e Arrondissement" and "Lyon" should count as the same city.
  return normalize(city ?? "").split(/[\s-]/)[0] ?? "";
}

function keywordScore(mission: Mission, keywords: readonly string[]): number {
  const title = normalize(mission.title);
  const body = normalize(`${mission.description} ${mission.skills.join(" ")}`);
  let score = 0;
  for (const keyword of keywords) {
    const needle = normalize(keyword).trim();
    if (needle.length < 3) continue;
    if (title.includes(needle)) score += WEIGHTS.keywordInTitle;
    else if (body.includes(needle)) score += WEIGHTS.keywordInDescription;
  }
  return score;
}

function proximityScore(mission: Mission, place: GeoPlace | null, radiusKm: number): number {
  if (!place || !mission.location) return 0;
  const { lat, lon, postalCode, city } = mission.location;
  if (lat !== undefined && lon !== undefined) {
    const distance = distanceKm(place, { lat, lon });
    return Math.max(0, WEIGHTS.proximityMax * (1 - distance / radiusKm));
  }
  if (postalCode && postalCode === place.postalCode) return WEIGHTS.samePostalCode;
  if (cityStem(city) && cityStem(city) === cityStem(place.label)) return WEIGHTS.sameCity;
  if (mission.location.adminAreaCode && mission.location.adminAreaCode === place.adminAreaCode) return WEIGHTS.sameAdminArea;
  return 0;
}

function commitmentScore(mission: Mission, maxCommitment: MissionSearchQuery["maxCommitment"]): number {
  if (!maxCommitment || maxCommitment === "any") return 0;
  if (mission.commitment === maxCommitment) return WEIGHTS.commitmentExact;
  if (maxCommitment === "one-off" && mission.commitment === "short-term") return WEIGHTS.commitmentClose;
  return 0;
}

/** Deterministic pre-ranking so the model only has to judge a short, relevant list. */
export function scoreMission(mission: Mission, query: MissionSearchQuery, place: GeoPlace | null, radiusKm: number): number {
  const wantedCauses = new Set(query.causes ?? []);
  const hasSkills = (query.skills?.length ?? 0) > 0;
  let score = 0;
  if (mission.causes.some((cause) => wantedCauses.has(cause))) score += WEIGHTS.causeMatch;
  if (hasSkills && mission.skillsBased) score += WEIGHTS.skillsBasedForSkilledPerson;
  score += keywordScore(mission, [...(query.skills ?? []), ...(query.interests ?? [])]);
  score += proximityScore(mission, place, radiusKm);
  score += commitmentScore(mission, query.maxCommitment);
  return score;
}
