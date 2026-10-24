import "server-only";

import type { Geocoder } from "@/features/geo/geocoder";
import { GeoplateformeGeocoder } from "@/features/geo/geoplateforme-geocoder";
import type { MissionProvider } from "@/features/missions/provider";
import { ApiEngagementProvider } from "@/features/missions/providers/api-engagement-provider";
import { ManaProvider } from "@/features/missions/providers/mana-provider";
import { CountryNotSupportedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface CountryRuntime {
  code: string;
  /** Language most missions are written in, used to phrase search keywords. */
  missionLanguage: string;
  geocoder: Geocoder;
  provider: MissionProvider;
}

type CountryFactory = () => CountryRuntime;

function createFranceRuntime(): CountryRuntime {
  const apiKey = process.env.API_ENGAGEMENT_API_KEY;
  let provider: MissionProvider;
  if (apiKey) {
    provider = new ApiEngagementProvider(apiKey);
  } else {
    logger.warn("missions.fr.using_mana_fallback", {
      reason: "API_ENGAGEMENT_API_KEY is not set; using the unofficial MANA relay",
    });
    provider = new ManaProvider();
  }
  return { code: "FR", missionLanguage: "fr", geocoder: new GeoplateformeGeocoder(), provider };
}

/** Adding a country means adding a factory here with its geocoder and mission provider. */
const COUNTRY_FACTORIES: Record<string, CountryFactory> = {
  FR: createFranceRuntime,
};

const runtimes = new Map<string, CountryRuntime>();

export function getCountryRuntime(countryCode: string): CountryRuntime {
  const code = countryCode.toUpperCase();
  const cached = runtimes.get(code);
  if (cached) return cached;

  const factory = COUNTRY_FACTORIES[code];
  if (!factory) throw new CountryNotSupportedError(code);
  const runtime = factory();
  runtimes.set(code, runtime);
  return runtime;
}
