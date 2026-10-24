/** Client-safe list of countries Aido can search in. Keep in sync with `countries.ts`. */
export const SUPPORTED_COUNTRIES = ["FR"] as const;
export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];
export const DEFAULT_COUNTRY: SupportedCountry = "FR";
