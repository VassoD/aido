import type { Cause, EngagementType } from "@/features/missions/mission";

/**
 * API Engagement "domain" values (shared by MANA, which relays the same data)
 * mapped onto Aido causes.
 */
const DOMAIN_TO_CAUSE: Record<string, Cause> = {
  animaux: "animals",
  autre: "other",
  "batiment-industrie-logistique": "other",
  "benevolat-competences": "other",
  communication: "other",
  "culture-loisirs": "culture",
  education: "education",
  emploi: "employment",
  environnement: "environment",
  "gestion-finance-droit": "other",
  humanitaire: "humanitarian",
  "memoire-et-citoyennete": "citizenship",
  numerique: "digital",
  "prevention-protection": "emergency",
  recherche: "research",
  sante: "health",
  "service-public-defense-securite": "emergency",
  sport: "sport",
  "solidarite-insertion": "solidarity",
  "vivre-ensemble": "citizenship",
};

/** Domains whose missions are about lending professional skills rather than a cause. */
const SKILLS_BASED_DOMAINS = new Set([
  "benevolat-competences",
  "communication",
  "gestion-finance-droit",
  "batiment-industrie-logistique",
]);

/**
 * Publishers classify loosely: JeVeuxAider files dog fostering under "environnement" and leaves
 * "animaux" empty. These domains are also searched for a cause, and the keywords below tag missions.
 */
const EXTRA_DOMAINS_FOR_CAUSE: Partial<Record<Cause, string[]>> = {
  animals: ["environnement"],
};

// Letter-aware boundaries: \b treats accented letters as non-word characters.
const wholeWords = (alternatives: string): RegExp => new RegExp(`(?<!\\p{L})(${alternatives})(?!\\p{L})`, "iu");

const CAUSE_KEYWORDS: Partial<Record<Cause, RegExp>> = {
  animals: wholeWords("animal|animaux|chiens?|chats?|chatons?|chiots?|refuges? animaliers?|équidés?|chevaux|cheval|faune|oiseaux"),
  digital: wholeWords("numérique|informatique|digital"),
  education: wholeWords("soutien scolaire|aide aux devoirs|alphabétisation|tutorat"),
};

export function domainToCause(domain: string | undefined | null): Cause {
  return (domain && DOMAIN_TO_CAUSE[domain]) || "other";
}

/** The domain's cause first, plus any cause the mission title clearly signals. */
export function inferCauses(domain: string | undefined | null, title: string): Cause[] {
  const causes = new Set<Cause>([domainToCause(domain)]);
  for (const [cause, pattern] of Object.entries(CAUSE_KEYWORDS) as [Cause, RegExp][]) {
    if (pattern.test(title)) causes.add(cause);
  }
  if (causes.size > 1) causes.delete("other");
  return [...causes];
}

export function isSkillsBasedDomain(domain: string | undefined | null): boolean {
  return domain !== undefined && domain !== null && SKILLS_BASED_DOMAINS.has(domain);
}

export function causesToDomains(causes: readonly Cause[]): string[] {
  const wanted = new Set(causes);
  const domains = new Set(
    Object.entries(DOMAIN_TO_CAUSE)
      .filter(([domain, cause]) => wanted.has(cause) && cause !== "other" && !SKILLS_BASED_DOMAINS.has(domain))
      .map(([domain]) => domain),
  );
  for (const cause of causes) {
    for (const domain of EXTRA_DOMAINS_FOR_CAUSE[cause] ?? []) domains.add(domain);
  }
  return [...domains];
}

/** "75011" -> "75", "97411" -> "974", "20090" -> "2A" (Corsica splits on the postal code). */
export function departmentFromPostalCode(postalCode: string | undefined): string | undefined {
  if (!postalCode || !/^\d{5}$/.test(postalCode)) return undefined;
  if (postalCode.startsWith("97") || postalCode.startsWith("98")) return postalCode.slice(0, 3);
  if (postalCode.startsWith("20")) return Number(postalCode) < 20200 ? "2A" : "2B";
  return postalCode.slice(0, 2);
}

export const SKILLS_BASED_DOMAIN_LIST = [...SKILLS_BASED_DOMAINS];

const TYPE_TO_ENGAGEMENT: Record<string, EngagementType> = {
  benevolat: "volunteering",
  volontariat_service_civique: "civic-service",
};

export function typeToEngagement(type: string | undefined | null): EngagementType {
  return (type && TYPE_TO_ENGAGEMENT[type]) || "other";
}

export function engagementToTypes(engagementTypes: readonly EngagementType[]): string[] {
  return Object.entries(TYPE_TO_ENGAGEMENT)
    .filter(([, engagement]) => engagementTypes.includes(engagement))
    .map(([type]) => type);
}
