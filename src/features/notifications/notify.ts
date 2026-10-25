import "server-only";

import {
  applicationDecisionEmail,
  missionCompletedEmail,
  newApplicationEmail,
  newMessageEmail,
} from "@/features/notifications/email-templates";
import { sendEmail } from "@/lib/email/brevo";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Links in emails open the French interface; the language switch is one click away. */
const EMAIL_LOCALE = "fr";

interface ApplicationContext {
  missionId: string;
  missionTitle: string;
  organizationName: string;
  organizationOwnerId: string;
  organizationEmail: string | null;
  volunteerId: string;
  volunteerName: string;
  volunteerEmail: string | null;
  fitSummary: string | null;
}

/** Everything a notification needs, read with the admin client because it spans both sides. */
async function loadApplicationContext(applicationId: string): Promise<ApplicationContext | null> {
  const admin = getSupabaseAdmin();
  const { data: application, error } = await admin
    .from("applications")
    .select("volunteer_id, fit_summary, mission:missions!inner(id, title, organization:organizations!inner(name, owner_id, contact_email))")
    .eq("id", applicationId)
    .maybeSingle();
  if (error || !application) {
    logger.warn("notify.application_not_found", { applicationId, code: error?.code });
    return null;
  }

  const { data: profile } = await admin
    .from("volunteer_profiles")
    .select("first_name, contact_email")
    .eq("user_id", application.volunteer_id)
    .maybeSingle();

  return {
    missionId: application.mission.id,
    missionTitle: application.mission.title,
    organizationName: application.mission.organization.name,
    organizationOwnerId: application.mission.organization.owner_id,
    organizationEmail: application.mission.organization.contact_email,
    volunteerId: application.volunteer_id,
    volunteerName: profile?.first_name ?? "Un bénévole",
    volunteerEmail: profile?.contact_email ?? null,
    fitSummary: application.fit_summary,
  };
}

export async function notifyNewApplication(applicationId: string, origin: string): Promise<void> {
  const context = await loadApplicationContext(applicationId);
  if (!context?.organizationEmail) return;
  const email = newApplicationEmail({
    volunteerName: context.volunteerName,
    missionTitle: context.missionTitle,
    fitSummary: context.fitSummary,
    inboxUrl: `${origin}/${EMAIL_LOCALE}/asso/missions/${context.missionId}`,
  });
  await sendEmail({
    to: { email: context.organizationEmail, name: context.organizationName },
    replyTo: context.volunteerEmail ? { email: context.volunteerEmail, name: context.volunteerName } : undefined,
    tag: "new-application",
    ...email,
  });
}

export async function notifyApplicationDecision(
  applicationId: string,
  status: "accepted" | "declined",
  origin: string,
): Promise<void> {
  const context = await loadApplicationContext(applicationId);
  if (!context?.volunteerEmail) return;
  const email = applicationDecisionEmail({
    volunteerName: context.volunteerName,
    organizationName: context.organizationName,
    missionTitle: context.missionTitle,
    accepted: status === "accepted",
    applicationsUrl: status === "accepted" ? `${origin}/${EMAIL_LOCALE}/me` : `${origin}/${EMAIL_LOCALE}`,
  });
  await sendEmail({
    to: { email: context.volunteerEmail, name: context.volunteerName },
    replyTo: context.organizationEmail ? { email: context.organizationEmail, name: context.organizationName } : undefined,
    tag: `application-${status}`,
    ...email,
  });
}

/** Thanks the volunteer once the association confirms the mission was done, and points them to their badges. */
export async function notifyMissionCompleted(applicationId: string, origin: string): Promise<void> {
  const context = await loadApplicationContext(applicationId);
  if (!context?.volunteerEmail) return;
  const email = missionCompletedEmail({
    volunteerName: context.volunteerName,
    organizationName: context.organizationName,
    missionTitle: context.missionTitle,
    badgesUrl: `${origin}/${EMAIL_LOCALE}/me#badges`,
  });
  await sendEmail({
    to: { email: context.volunteerEmail, name: context.volunteerName },
    tag: "mission-completed",
    ...email,
  });
}

/** Tells the other side of the conversation that a message is waiting. */
export async function notifyNewMessage(applicationId: string, senderId: string, body: string, origin: string): Promise<void> {
  const context = await loadApplicationContext(applicationId);
  if (!context) return;

  const fromVolunteer = senderId === context.volunteerId;
  const recipientEmail = fromVolunteer ? context.organizationEmail : context.volunteerEmail;
  if (!recipientEmail) return;

  const email = newMessageEmail({
    senderName: fromVolunteer ? context.volunteerName : context.organizationName,
    missionTitle: context.missionTitle,
    body,
    threadUrl: fromVolunteer
      ? `${origin}/${EMAIL_LOCALE}/asso/missions/${context.missionId}`
      : `${origin}/${EMAIL_LOCALE}/me`,
  });
  await sendEmail({
    to: { email: recipientEmail, name: fromVolunteer ? context.organizationName : context.volunteerName },
    tag: "new-message",
    ...email,
  });
}
