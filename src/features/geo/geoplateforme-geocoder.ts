import { z } from "zod";

import type { GeoPlace, Geocoder } from "@/features/geo/geocoder";
import { GeocodingError, NetworkError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";
import { TtlCache } from "@/lib/ttl-cache";

const GEOPLATEFORME_SEARCH_URL = "https://data.geopf.fr/geocodage/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 2_000;
const MIN_SCORE = 0.4;

const featureCollectionSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: z.object({
        label: z.string(),
        score: z.number(),
        postcode: z.string().optional(),
        citycode: z.string().optional(),
        city: z.string().optional(),
        context: z.string().optional(),
        depcode: z.string().optional(),
      }),
    }),
  ),
});

type Feature = z.infer<typeof featureCollectionSchema>["features"][number];

function toPlace(feature: Feature): GeoPlace {
  const [lon, lat] = feature.geometry.coordinates;
  const [departmentCode, departmentName, regionName] = (feature.properties.context ?? "").split(", ");
  return {
    label: feature.properties.city ?? feature.properties.label,
    lat,
    lon,
    countryCode: "FR",
    postalCode: feature.properties.postcode,
    localAdminCode: feature.properties.citycode,
    // "depcode" is truncated to "97" overseas; the context starts with the full code ("974").
    adminAreaCode: departmentCode || feature.properties.depcode,
    adminAreaName: departmentName,
    regionName,
  };
}

/** France geocoder backed by the IGN Géoplateforme (Base Adresse Nationale). Open, no key. */
export class GeoplateformeGeocoder implements Geocoder {
  private readonly cache = new TtlCache<GeoPlace | null>(CACHE_MAX_ENTRIES, CACHE_TTL_MS);

  async geocode(query: string, signal?: AbortSignal): Promise<GeoPlace | null> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;

    return this.cache.getOrLoad(normalized, async () => {
      try {
        const municipality = await this.search(normalized, "municipality", signal);
        if (municipality) return municipality;
        return await this.search(normalized, undefined, signal);
      } catch (error) {
        if (error instanceof NetworkError) {
          throw new GeocodingError("Geocoding service unavailable", { cause: error });
        }
        throw error;
      }
    });
  }

  private async search(query: string, type: "municipality" | undefined, signal?: AbortSignal): Promise<GeoPlace | null> {
    const params = new URLSearchParams({ q: query, limit: "1" });
    if (type) params.set("type", type);

    const result = await fetchJson(`${GEOPLATEFORME_SEARCH_URL}?${params}`, {
      schema: featureCollectionSchema,
      signal,
    });
    const best = result.features[0];
    if (!best || best.properties.score < MIN_SCORE) return null;
    return toPlace(best);
  }
}
