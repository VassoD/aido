import "server-only";

import { z } from "zod";

import { computeBadges, type BadgeProgress, type CompletedMission } from "@/features/volunteers/badges";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AppSupabaseClient } from "@/lib/supabase/server";

const answersSchema = z.array(z.object({ question: z.string(), answer: z.string() })).catch([]);
const questionsSchema = z.array(z.object({ id: z.string(), label: z.string(), kind: z.string() })).catch([]);

export interface ThreadMessage {
  id: string;
  body: string;
  createdAt: string;
  fromMe: boolean;
}

export interface ApplicationView {
  id: string;
  status: string;
  createdAt: string;
  answers: { question: string; answer: string }[];
  motivation: string | null;
  fitSummary: string | null;
  messages: ThreadMessage[];
}

export interface ApplicantView extends ApplicationView {
  volunteer: {
    firstName: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
    skills: string[];
    causes: string[];
    badges: BadgeProgress;
  };
}

export interface MyApplicationView extends ApplicationView {
  completedAt: string | null;
  mission: { id: string; title: string; city: string | null; cause: string; organizationName: string; contactEmail: string | null };
}

async function loadThreads(
  supabase: AppSupabaseClient,
  applicationIds: string[],
  viewerId: string,
): Promise<Map<string, ThreadMessage[]>> {
  const threads = new Map<string, ThreadMessage[]>();
  if (applicationIds.length === 0) return threads;

  const { data, error } = await supabase
    .from("application_messages")
    .select("id, application_id, sender_id, body, created_at")
    .in("application_id", applicationIds)
    .order("created_at", { ascending: true });
  if (error) throw error;

  for (const message of data ?? []) {
    const thread = threads.get(message.application_id) ?? [];
    thread.push({ id: message.id, body: message.body, createdAt: message.created_at, fromMe: message.sender_id === viewerId });
    threads.set(message.application_id, thread);
  }
  return threads;
}

/**
 * Badges are a volunteer's public track record, so they count missions completed with any association.
 * Row level security only shows this association's own applications, hence the admin client; callers
 * must already have proven the viewer owns a mission these volunteers applied to.
 */
async function loadCompletedMissions(volunteerIds: string[]): Promise<Map<string, CompletedMission[]>> {
  const completed = new Map<string, CompletedMission[]>();
  if (volunteerIds.length === 0) return completed;

  const { data, error } = await getSupabaseAdmin()
    .from("applications")
    .select("volunteer_id, completed_at, mission:missions!inner(cause)")
    .eq("status", "completed")
    .in("volunteer_id", volunteerIds);
  if (error) throw error;

  for (const row of data ?? []) {
    const missions = completed.get(row.volunteer_id) ?? [];
    missions.push({ cause: row.mission.cause, completedAt: row.completed_at ?? "" });
    completed.set(row.volunteer_id, missions);
  }
  return completed;
}

export interface MissionWithApplicants {
  mission: {
    id: string;
    title: string;
    status: string;
    city: string | null;
    description: string;
    commitment: string;
    scheduleText: string | null;
    places: number | null;
    questions: { id: string; label: string; kind: string }[];
  };
  applicants: ApplicantView[];
}

/** Row level security limits this to missions the viewer's organization owns. */
export async function getMissionApplicants(
  supabase: AppSupabaseClient,
  missionId: string,
  viewerId: string,
): Promise<MissionWithApplicants | null> {
  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("id, title, status, city, description, commitment, schedule_text, places, questions")
    .eq("id", missionId)
    .maybeSingle();
  if (missionError) throw missionError;
  if (!mission) return null;

  const { data: applications, error } = await supabase
    .from("applications")
    .select("id, volunteer_id, status, created_at, answers, motivation, fit_summary")
    .eq("mission_id", missionId)
    .neq("status", "withdrawn")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const volunteerIds = (applications ?? []).map((application) => application.volunteer_id);
  const { data: profiles, error: profileError } = volunteerIds.length
    ? await supabase
        .from("volunteer_profiles")
        .select("user_id, first_name, city, contact_email, phone, linkedin_url, skills, causes")
        .in("user_id", volunteerIds)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const completedByVolunteer = await loadCompletedMissions(volunteerIds);

  const threads = await loadThreads(supabase, (applications ?? []).map((application) => application.id), viewerId);

  return {
    mission: {
      id: mission.id,
      title: mission.title,
      status: mission.status,
      city: mission.city,
      description: mission.description,
      commitment: mission.commitment,
      scheduleText: mission.schedule_text,
      places: mission.places,
      questions: questionsSchema.parse(mission.questions),
    },
    applicants: (applications ?? []).map((application) => {
      const profile = profileById.get(application.volunteer_id);
      return {
        id: application.id,
        status: application.status,
        createdAt: application.created_at,
        answers: answersSchema.parse(application.answers),
        motivation: application.motivation,
        fitSummary: application.fit_summary,
        messages: threads.get(application.id) ?? [],
        volunteer: {
          firstName: profile?.first_name ?? null,
          city: profile?.city ?? null,
          email: profile?.contact_email ?? null,
          phone: profile?.phone ?? null,
          linkedinUrl: profile?.linkedin_url ?? null,
          skills: profile?.skills ?? [],
          causes: profile?.causes ?? [],
          badges: computeBadges({
            firstApplicationAt: application.created_at,
            completed: completedByVolunteer.get(application.volunteer_id) ?? [],
          }),
        },
      };
    }),
  };
}

export async function getMyApplications(supabase: AppSupabaseClient, userId: string): Promise<MyApplicationView[]> {
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, completed_at, answers, motivation, fit_summary, mission:missions!inner(id, title, city, cause, organization:organizations!inner(name, contact_email))",
    )
    .eq("volunteer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const threads = await loadThreads(supabase, (data ?? []).map((application) => application.id), userId);

  return (data ?? []).map((application) => ({
    id: application.id,
    status: application.status,
    createdAt: application.created_at,
    completedAt: application.completed_at,
    answers: answersSchema.parse(application.answers),
    motivation: application.motivation,
    // The association's private triage note is not shown to the volunteer.
    fitSummary: null,
    messages: threads.get(application.id) ?? [],
    mission: {
      id: application.mission.id,
      title: application.mission.title,
      city: application.mission.city,
      cause: application.mission.cause,
      organizationName: application.mission.organization.name,
      contactEmail: application.mission.organization.contact_email,
    },
  }));
}
