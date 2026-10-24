import "server-only";

import { z } from "zod";

import { NetworkError } from "@/lib/errors";
import { fetchJson } from "@/lib/http";

const REGISTER_SEARCH_URL = "https://recherche-entreprises.api.gouv.fr/search";
// The register is sometimes slow (15 to 20 s observed), so allow long attempts rather than many short ones.
const LOOKUP_TIMEOUT_MS = 25_000;
const ACTIVE_STATUS = "A";
/** Nature juridique 9xxx: non-commercial private-law bodies (associations, foundations...). */
const NON_PROFIT_LEGAL_FORM_PREFIX = "9";

const RNA_PATTERN = /^W\d{9}$/;
const SIREN_PATTERN = /^\d{9}$/;
const SIRET_PATTERN = /^\d{14}$/;

const registerSchema = z.object({
  results: z.array(
    z.looseObject({
      siren: z.string(),
      nom_complet: z.string(),
      nature_juridique: z.string().nullish(),
      etat_administratif: z.string().nullish(),
      complements: z
        .looseObject({
          est_association: z.boolean().nullish(),
          est_ess: z.boolean().nullish(),
          identifiant_association: z.string().nullish(),
        })
        .nullish(),
      siege: z
        .looseObject({
          libelle_commune: z.string().nullish(),
          code_postal: z.string().nullish(),
          latitude: z.string().nullish(),
          longitude: z.string().nullish(),
        })
        .nullish(),
    }),
  ),
});

export type NationalIdType = "rna" | "siren";

export interface RegisteredOrganization {
  /** Development-only test organization: never marked as verified. */
  isDemo?: boolean;
  nationalId: string;
  nationalIdType: NationalIdType;
  siren: string;
  rna?: string;
  name: string;
  city?: string;
  postalCode?: string;
}

export type RegisterLookupResult =
  | { status: "found"; organization: RegisteredOrganization }
  | { status: "invalid_format" }
  | { status: "not_found" }
  | { status: "inactive" }
  | { status: "not_nonprofit" }
  | { status: "unavailable" };

/** Test numbers that bypass the register, so the association flow can be tried without a real RNA or SIREN. */
export const DEMO_NATIONAL_IDS = new Set(["W000000000", "000000000"]);

export function demoOrganizationsEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_ORGANIZATIONS === "true";
}

const DEMO_ORGANIZATION: RegisteredOrganization = {
  isDemo: true,
  nationalId: "000000000",
  nationalIdType: "siren",
  siren: "000000000",
  name: "Association de démonstration",
  city: "Paris",
  postalCode: "75011",
};

export function normalizeNationalId(raw: string): { id: string; type: NationalIdType } | null {
  const compact = raw.replace(/[\s.-]/g, "").toUpperCase();
  if (RNA_PATTERN.test(compact)) return { id: compact, type: "rna" };
  if (SIREN_PATTERN.test(compact)) return { id: compact, type: "siren" };
  if (SIRET_PATTERN.test(compact)) return { id: compact.slice(0, 9), type: "siren" };
  return null;
}

function titleCase(name: string): string {
  return name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toUpperCase());
}

/**
 * Checks an association against the official French register (API Recherche d'Entreprises, open, no key).
 * This proves the organization exists and is active; it does not prove the person signing up represents it.
 */
export async function lookupFrenchOrganization(rawId: string, signal?: AbortSignal): Promise<RegisterLookupResult> {
  const normalized = normalizeNationalId(rawId);
  if (!normalized) return { status: "invalid_format" };
  if (DEMO_NATIONAL_IDS.has(normalized.id) && demoOrganizationsEnabled()) {
    return { status: "found", organization: DEMO_ORGANIZATION };
  }

  let results: z.infer<typeof registerSchema>["results"];
  try {
    const params = new URLSearchParams({ q: normalized.id, per_page: "5" });
    ({ results } = await fetchJson(`${REGISTER_SEARCH_URL}?${params}`, {
      schema: registerSchema,
      timeoutMs: LOOKUP_TIMEOUT_MS,
      retries: 1,
      signal,
    }));
  } catch (error) {
    if (error instanceof NetworkError) return { status: "unavailable" };
    throw error;
  }

  const match = results.find((result) =>
    normalized.type === "siren" ? result.siren === normalized.id : result.complements?.identifiant_association === normalized.id,
  );
  if (!match) return { status: "not_found" };
  if (match.etat_administratif !== ACTIVE_STATUS) return { status: "inactive" };

  const isNonProfit =
    match.complements?.est_association === true ||
    match.complements?.est_ess === true ||
    (match.nature_juridique ?? "").startsWith(NON_PROFIT_LEGAL_FORM_PREFIX);
  if (!isNonProfit) return { status: "not_nonprofit" };

  return {
    status: "found",
    organization: {
      nationalId: normalized.id,
      nationalIdType: normalized.type,
      siren: match.siren,
      rna: match.complements?.identifiant_association ?? undefined,
      name: titleCase(match.nom_complet),
      city: match.siege?.libelle_commune ? titleCase(match.siege.libelle_commune) : undefined,
      postalCode: match.siege?.code_postal ?? undefined,
    },
  };
}
