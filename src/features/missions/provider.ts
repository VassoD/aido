import type { GeoPlace } from "@/features/geo/geocoder";
import type { Mission } from "@/features/missions/mission";
import type { MissionSearchQuery } from "@/features/missions/search-query";

export interface ProviderSearchParams {
  query: MissionSearchQuery;
  /** Resolved location, or null for remote-only or location-less searches. */
  place: GeoPlace | null;
  radiusKm: number;
  signal?: AbortSignal;
}

/**
 * A source of volunteering missions for one or more countries.
 * Adapters translate the country-agnostic query into the provider's filters
 * and map results onto the normalized Mission model.
 */
export interface MissionProvider {
  readonly id: string;
  readonly displayName: string;
  /** Short notice shown in the UI about where the data comes from. */
  readonly attributionLabel: string;
  /** Whether the provider can filter by distance itself or only by administrative area. */
  readonly supportsRadiusSearch: boolean;
  search(params: ProviderSearchParams): Promise<Mission[]>;
  getById(sourceId: string, signal?: AbortSignal): Promise<Mission | null>;
}
