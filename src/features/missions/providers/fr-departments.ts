import type { GeoPlace } from "@/features/geo/geocoder";
import centroids from "@/features/missions/providers/fr-department-centroids.json";
import { distanceKm } from "@/features/missions/ranking";

/**
 * Population-weighted centre of each département, generated from API Geo (geo.api.gouv.fr) commune data.
 * A few départements use their prefecture instead, where that data could not be fetched.
 * A département spans roughly 60 to 120 km, so a mission can sit this far from its centre.
 */
const DEPARTMENT_REACH_KM = 30;

const CENTROIDS: Record<string, number[]> = centroids;

/** Départements worth searching for a place and radius, nearest first, starting with the place's own. */
export function departmentsNear(place: GeoPlace, radiusKm: number): string[] {
  const nearby = Object.entries(CENTROIDS)
    .map(([code, [lat = 0, lon = 0]]) => ({ code, distance: distanceKm(place, { lat, lon }) }))
    .filter(({ distance }) => distance <= radiusKm + DEPARTMENT_REACH_KM)
    .sort((left, right) => left.distance - right.distance)
    .map(({ code }) => code);

  const own = place.adminAreaCode;
  return own ? [own, ...nearby.filter((code) => code !== own)] : nearby;
}
