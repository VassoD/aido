"use server";

import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";

const profileSchema = z.object({
  firstName: z.string().trim().max(80),
  city: z.string().trim().max(120),
  phone: z.string().trim().max(40),
  about: z.string().trim().max(1500),
});
export type VolunteerProfileInput = z.infer<typeof profileSchema>;

export async function updateVolunteerProfileAction(input: VolunteerProfileInput): Promise<ActionResult<null>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT");
  const { firstName, city, phone, about } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");

  const { error } = await supabase.from("volunteer_profiles").upsert({
    user_id: user.id,
    first_name: firstName || null,
    city: city || null,
    phone: phone || null,
    about: about || null,
    contact_email: user.email ?? null,
  });
  if (error) {
    logger.error("volunteers.profile_update_failed", { userId: user.id, code: error.code });
    return fail("INTERNAL_ERROR");
  }
  return ok(null);
}
