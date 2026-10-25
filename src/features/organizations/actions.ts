"use server";

import { z } from "zod";

import { getCountryRuntime } from "@/features/missions/countries";
import { draftMissionWithAi } from "@/features/organizations/draft-mission-with-ai";
import { missionDraftSchema, type MissionDraft } from "@/features/organizations/mission-draft";
import { getOwnedOrganization } from "@/features/organizations/queries";
import { lookupFrenchOrganization, type RegisterLookupResult } from "@/features/organizations/register-lookup";
import { LOCALES } from "@/i18n/routing";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";

const MAX_DESCRIPTION_CHARS = 6_000;
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const UNIQUE_VIOLATION = "23505";

export async function lookupOrganizationAction(nationalId: string): Promise<ActionResult<RegisterLookupResult>> {
  if (typeof nationalId !== "string" || nationalId.length > 40) return fail("INVALID_INPUT");
  return ok(await lookupFrenchOrganization(nationalId));
}

/** Re-checks the register server-side (the client's preview is never trusted), then creates a verified organization. */
export async function createOrganizationAction(nationalId: string): Promise<ActionResult<{ organizationId: string }>> {
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");

  const lookup = await lookupFrenchOrganization(nationalId);
  if (lookup.status === "unavailable") return fail("PROVIDER_UNAVAILABLE");
  if (lookup.status !== "found") return fail("INVALID_INPUT");

  const { organization } = lookup;
  const isDemo = organization.isDemo === true;
  const { data, error } = await getSupabaseAdmin()
    .from("organizations")
    .insert({
      owner_id: user.id,
      name: organization.name,
      country_code: "FR",
      // Each tester gets their own demo organization; the real SIREN is unique per country.
      national_id: isDemo ? `DEMO-${user.id}` : organization.siren,
      national_id_type: "siren",
      verified: !isDemo,
      verified_at: isDemo ? null : new Date().toISOString(),
      city: organization.city ?? null,
      postal_code: organization.postalCode ?? null,
      contact_email: user.email ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return fail("CONFLICT");
    logger.error("organizations.create_failed", { userId: user.id, code: error.code });
    return fail("INTERNAL_ERROR");
  }
  return ok({ organizationId: data.id });
}

const draftInputSchema = z.object({
  text: z.string().max(MAX_DESCRIPTION_CHARS),
  locale: z.enum(LOCALES),
});

export async function draftMissionAction(formData: FormData): Promise<ActionResult<MissionDraft>> {
  const parsed = draftInputSchema.safeParse({ text: formData.get("text") ?? "", locale: formData.get("locale") });
  if (!parsed.success) return fail("INVALID_INPUT");

  const file = formData.get("pdf");
  const pdf = file instanceof File && file.size > 0 ? file : null;
  if (pdf && (pdf.type !== "application/pdf" || pdf.size > MAX_PDF_BYTES)) return fail("INVALID_INPUT");
  if (!pdf && parsed.data.text.trim().length < 20) return fail("INVALID_INPUT");

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");
  const organization = await getOwnedOrganization(supabase, user.id);
  if (!organization) return fail("NOT_FOUND");

  try {
    const draft = await draftMissionWithAi({
      organizationName: organization.name,
      organizationCity: organization.city ?? undefined,
      organizationDescription: organization.description ?? undefined,
      locale: parsed.data.locale,
      text: parsed.data.text,
      pdf: pdf ? { data: new Uint8Array(await pdf.arrayBuffer()), filename: pdf.name } : undefined,
    });
    // An on-site mission without a place matches no local search; start from the association's city.
    const needsPlace = draft.locationMode !== "remote" && !draft.city;
    return ok(needsPlace ? { ...draft, city: organization.city ?? null } : draft);
  } catch (error) {
    logger.error("missions.draft_failed", { organizationId: organization.id, error: String(error) });
    return fail("AI_UNAVAILABLE");
  }
}

export async function publishMissionAction(draft: MissionDraft): Promise<ActionResult<{ missionId: string }>> {
  const parsed = missionDraftSchema.safeParse(draft);
  if (!parsed.success) return fail("INVALID_INPUT");
  const mission = parsed.data;

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");
  const organization = await getOwnedOrganization(supabase, user.id);
  if (!organization) return fail("NOT_FOUND");

  const city = mission.city ?? (mission.locationMode === "remote" ? null : organization.city);
  const place = city
    ? await getCountryRuntime(organization.country_code).geocoder.geocode(city).catch(() => null)
    : null;

  const { data, error } = await supabase
    .from("missions")
    .insert({
      organization_id: organization.id,
      title: mission.title,
      description: mission.description,
      country_code: organization.country_code,
      city: place?.label ?? city,
      postal_code: place?.postalCode ?? null,
      admin_area_code: place?.adminAreaCode ?? null,
      lat: place?.lat ?? null,
      lon: place?.lon ?? null,
      location_mode: mission.locationMode,
      commitment: mission.commitment,
      cause: mission.cause,
      skills: mission.skills,
      schedule_text: mission.scheduleText,
      start_date: mission.startDate,
      end_date: mission.endDate,
      places: mission.places,
      questions: mission.questions,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    logger.error("missions.publish_failed", { organizationId: organization.id, code: error.code });
    return fail("INTERNAL_ERROR");
  }
  return ok({ missionId: data.id });
}

export async function setMissionStatusAction(
  missionId: string,
  status: "published" | "closed",
): Promise<ActionResult<null>> {
  if (!z.uuid().safeParse(missionId).success || !["published", "closed"].includes(status)) return fail("INVALID_INPUT");
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");

  const { error, count } = await supabase
    .from("missions")
    .update({ status }, { count: "exact" })
    .eq("id", missionId);
  if (error) return fail("INTERNAL_ERROR");
  if (!count) return fail("NOT_FOUND");
  return ok(null);
}

const organizationProfileSchema = z.object({
  description: z.string().trim().max(2000),
  website: z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(300)]),
  contactEmail: z.union([z.literal(""), z.email().max(320)]),
  city: z.string().trim().max(120),
});
export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;

/** Verification columns are not granted to clients, so this can only touch the public profile. */
export async function updateOrganizationProfileAction(input: OrganizationProfileInput): Promise<ActionResult<null>> {
  const parsed = organizationProfileSchema.safeParse({
    ...input,
    website: typeof input?.website === "string" ? input.website.trim() : input?.website,
    contactEmail: typeof input?.contactEmail === "string" ? input.contactEmail.trim() : input?.contactEmail,
  });
  if (!parsed.success) return fail("INVALID_INPUT");
  const { description, website, contactEmail, city } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");
  const organization = await getOwnedOrganization(supabase, user.id);
  if (!organization) return fail("NOT_FOUND");

  const { error } = await supabase
    .from("organizations")
    .update({
      description: description || null,
      website: website || null,
      contact_email: contactEmail || null,
      city: city || null,
    })
    .eq("id", organization.id);
  if (error) {
    logger.error("organizations.profile_update_failed", { organizationId: organization.id, code: error.code });
    return fail("INTERNAL_ERROR");
  }
  return ok(null);
}
