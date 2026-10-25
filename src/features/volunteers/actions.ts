"use server";

import { z } from "zod";

import { linkedinUrlSchema, mergeTags, understoodSchema, type Understood } from "@/features/volunteers/profile-tags";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";

const profileSchema = z.object({
  firstName: z.string().trim().max(80),
  city: z.string().trim().max(120),
  phone: z.string().trim().max(40),
  linkedinUrl: z.string().trim().pipe(linkedinUrlSchema),
  about: z.string().trim().max(1500),
});
export type VolunteerProfileInput = z.input<typeof profileSchema>;

export async function updateVolunteerProfileAction(input: VolunteerProfileInput): Promise<ActionResult<null>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT");
  const { firstName, city, phone, linkedinUrl, about } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");

  const { error } = await supabase.from("volunteer_profiles").upsert({
    user_id: user.id,
    first_name: firstName || null,
    city: city || null,
    phone: phone || null,
    linkedin_url: linkedinUrl || null,
    about: about || null,
    contact_email: user.email ?? null,
  });
  if (error) {
    logger.error("volunteers.profile_update_failed", { userId: user.id, code: error.code });
    return fail("INTERNAL_ERROR");
  }
  return ok(null);
}

/**
 * Keeps what the matching chat understood (causes, interests, skills) on the volunteer's profile.
 * Visitors chatting without an account get AUTH_REQUIRED, which the chat ignores.
 */
export async function rememberUnderstandingAction(input: Understood): Promise<ActionResult<null>> {
  const parsed = understoodSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT");

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");

  const { data: current, error: readError } = await supabase
    .from("volunteer_profiles")
    .select("causes, interests, skills")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) {
    logger.warn("volunteers.understanding_read_failed", { userId: user.id, code: readError.code });
    return fail("INTERNAL_ERROR");
  }

  const { error } = await supabase.from("volunteer_profiles").upsert({
    user_id: user.id,
    contact_email: user.email ?? null,
    causes: mergeTags(parsed.data.causes, current?.causes ?? []),
    interests: mergeTags(parsed.data.interests, current?.interests ?? []),
    skills: mergeTags(parsed.data.skills, current?.skills ?? []),
  });
  if (error) {
    logger.warn("volunteers.understanding_save_failed", { userId: user.id, code: error.code });
    return fail("INTERNAL_ERROR");
  }
  return ok(null);
}

/** The volunteer's own edits to those tags replace the lists as they are. */
export async function updateUnderstandingAction(input: Understood): Promise<ActionResult<null>> {
  const parsed = understoodSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT");

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");

  const { error } = await supabase.from("volunteer_profiles").upsert({
    user_id: user.id,
    contact_email: user.email ?? null,
    causes: mergeTags(parsed.data.causes, []),
    interests: mergeTags(parsed.data.interests, []),
    skills: mergeTags(parsed.data.skills, []),
  });
  if (error) {
    logger.error("volunteers.understanding_update_failed", { userId: user.id, code: error.code });
    return fail("INTERNAL_ERROR");
  }
  return ok(null);
}
