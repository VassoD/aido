export interface GeoPlace {
  label: string;
  lat: number;
  lon: number;
  countryCode: string;
  postalCode?: string;
  /** Smallest administrative unit code, e.g. the INSEE commune code in France. */
  localAdminCode?: string;
  /** Intermediate administrative area code, e.g. a French département. */
  adminAreaCode?: string;
  adminAreaName?: string;
  regionName?: string;
}

export interface Geocoder {
  /** Resolves free text ("Lyon 7e", "75011", "Montreuil") to a place, or null when nothing matches. */
  geocode(query: string, signal?: AbortSignal): Promise<GeoPlace | null>;
}
