"use server";

import { z } from "zod";

import { prefillApplication, summarizeFit, type ApplicationPrefill } from "@/features/applications/application-ai";
import { getInAppMission } from "@/features/missions/aido-missions";
import type { Mission } from "@/features/missions/mission";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { RateLimiter } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-origin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";

const MAX_TRANSCRIPT_CHARS = 8_000;
const UNIQUE_VIOLATION = "23505";
const PREFILL_LIMIT = 20;
const PREFILL_WINDOW_MS = 10 * 60 * 1000;
const prefillLimiter = new RateLimiter(PREFILL_LIMIT, PREFILL_WINDOW_MS);

export async function prefillApplicationAction(
  missionId: string,
  transcript: string,
): Promise<ActionResult<ApplicationPrefill>> {
  if (!z.uuid().safeParse(missionId).success || typeof transcript !== "string") return fail("INVALID_INPUT");
  try {
    prefillLimiter.consume(await requestIp());
  } catch {
    return fail("RATE_LIMIT_EXCEEDED");
  }

  const mission = await getInAppMission(missionId);
  if (!mission) return fail("NOT_FOUND");
  if (!transcript.trim()) return ok({ firstName: null, city: null, answers: [], motivation: null });

  try {
    return ok(await prefillApplication(mission, transcript.slice(-MAX_TRANSCRIPT_CHARS)));
  } catch (error) {
    logger.warn("applications.prefill_failed", { missionId, error: String(error) });
    return fail("AI_UNAVAILABLE");
  }
}

const submitSchema = z.object({
  missionId: z.uuid(),
  firstName: z.string().trim().min(1).max(80),
  city: z.string().trim().max(120),
  phone: z.string().trim().max(40),
  answers: z.array(z.object({ questionId: z.string().max(20), answer: z.string().trim().max(1000) })).max(10),
  motivation: z.string().trim().max(2000),
});
export type SubmitApplicationInput = z.infer<typeof submitSchema>;

export async function submitApplicationAction(input: SubmitApplicationInput): Promise<ActionResult<{ applicationId: string }>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT");
  const { missionId, firstName, city, phone, answers, motivation } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");

  const mission = await getInAppMission(missionId);
  if (!mission?.inApp) return fail("NOT_FOUND");

  const questionsById = new Map(mission.inApp.questions.map((question) => [question.id, question.label]));
  const labelledAnswers = answers
    .filter((entry) => questionsById.has(entry.questionId) && entry.answer)
    .map((entry) => ({ questionId: entry.questionId, question: questionsById.get(entry.questionId) ?? "", answer: entry.answer }));

  const { error: profileError } = await supabase.from("volunteer_profiles").upsert({
    user_id: user.id,
    first_name: firstName,
    city: city || null,
    phone: phone || null,
    contact_email: user.email ?? null,
  });
  if (profileError) {
    logger.error("applications.profile_upsert_failed", { userId: user.id, code: profileError.code });
    return fail("INTERNAL_ERROR");
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({ mission_id: missionId, volunteer_id: user.id, answers: labelledAnswers, motivation: motivation || null })
    .select("id")
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return fail("CONFLICT");
    logger.error("applications.insert_failed", { userId: user.id, missionId, code: error.code });
    return fail("INTERNAL_ERROR");
  }

  // The fit summary is a convenience for the association; the application stands without it.
  try {
    const summary = await summarizeFit(mission, labelledAnswers, motivation);
    await getSupabaseAdmin().from("applications").update({ fit_summary: summary }).eq("id", data.id);
  } catch (summaryError) {
    logger.warn("applications.fit_summary_failed", { applicationId: data.id, error: String(summaryError) });
  }
  return ok({ applicationId: data.id });
}

const statusSchema = z.object({
  applicationId: z.uuid(),
  status: z.enum(["accepted", "declined", "pending", "withdrawn"]),
});

export async function updateApplicationStatusAction(
  applicationId: string,
  status: z.infer<typeof statusSchema>["status"],
): Promise<ActionResult<null>> {
  const parsed = statusSchema.safeParse({ applicationId, status });
  if (!parsed.success) return fail("INVALID_INPUT");

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");

  const { error, count } = await supabase
    .from("applications")
    .update({ status: parsed.data.status }, { count: "exact" })
    .eq("id", parsed.data.applicationId);
  if (error) {
    logger.warn("applications.status_update_failed", { applicationId, code: error.code });
    return fail(error.code === "42501" ? "AUTH_REQUIRED" : "INTERNAL_ERROR");
  }
  if (!count) return fail("NOT_FOUND");
  return ok(null);
}

const messageSchema = z.object({ applicationId: z.uuid(), body: z.string().trim().min(1).max(2000) });

export async function sendApplicationMessageAction(applicationId: string, body: string): Promise<ActionResult<null>> {
  const parsed = messageSchema.safeParse({ applicationId, body });
  if (!parsed.success) return fail("INVALID_INPUT");

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("AUTH_REQUIRED");

  const { error } = await supabase
    .from("application_messages")
    .insert({ application_id: parsed.data.applicationId, sender_id: user.id, body: parsed.data.body });
  if (error) {
    logger.warn("applications.message_failed", { applicationId, code: error.code });
    return fail("INTERNAL_ERROR");
  }
  return ok(null);
}

export async function getApplyableMissionAction(missionId: string): Promise<ActionResult<Mission>> {
  if (!z.uuid().safeParse(missionId).success) return fail("INVALID_INPUT");
  const mission = await getInAppMission(missionId);
  return mission ? ok(mission) : fail("NOT_FOUND");
}
