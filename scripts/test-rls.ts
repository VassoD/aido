// Integration check of row level security against the real Supabase project.
// Creates throwaway users, exercises allowed and forbidden actions, then deletes everything it created.
import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const admin: Client = createClient(url, process.env.SUPABASE_SECRET_KEY ?? "", { auth: { persistSession: false } });

let failures = 0;
function check(label: string, passed: boolean, detail = ""): void {
  if (!passed) failures++;
  console.log(`${passed ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
}

async function makeUser(tag: string): Promise<{ id: string; client: Client }> {
  const email = `aido-rls-${tag}-${randomUUID().slice(0, 8)}@example.com`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  const client: Client = createClient(url, publishable, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

async function main(): Promise<void> {
  const owner = await makeUser("owner");
  const volunteer = await makeUser("volunteer");
  const stranger = await makeUser("stranger");
  const anonymous: Client = createClient(url, publishable, { auth: { persistSession: false } });
  const createdUsers = [owner.id, volunteer.id, stranger.id];

  try {
    const selfInsert = await owner.client.from("organizations").insert({ owner_id: owner.id, name: "Fake", national_id: "123456789", national_id_type: "siren", verified: true });
    check("owner cannot create a self-verified organization", selfInsert.error !== null, selfInsert.error?.code);

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ owner_id: owner.id, name: "Test Asso RLS", national_id: `9${Date.now()}`.slice(0, 9), national_id_type: "siren", verified: true })
      .select("id")
      .single();
    if (orgError || !org) throw orgError;

    const verifyTamper = await owner.client.from("organizations").update({ verified: false }).eq("id", org.id);
    check("owner cannot change the verified flag", verifyTamper.error !== null, verifyTamper.error?.code);
    const rename = await owner.client.from("organizations").update({ description: "Hello" }).eq("id", org.id).select("id");
    check("owner can edit their description", !rename.error && rename.data?.length === 1);

    const missionInsert = await owner.client
      .from("missions")
      .insert({ organization_id: org.id, title: "Mission de test RLS", description: "Une mission de test pour vérifier la sécurité.", status: "published", published_at: new Date().toISOString(), questions: [{ id: "q1", label: "Dispo le mardi ?", kind: "yes_no" }] })
      .select("id")
      .single();
    check("owner can publish a mission", !missionInsert.error, missionInsert.error?.message);
    const missionId = missionInsert.data?.id ?? "";

    const hijack = await stranger.client.from("missions").insert({ organization_id: org.id, title: "Hijack", description: "Should not be allowed at all." });
    check("stranger cannot post for another organization", hijack.error !== null, hijack.error?.code);

    const publicRead = await anonymous.from("missions").select("id, organization:organizations!inner(name, verified)").eq("id", missionId);
    check("anonymous visitors see the published mission", publicRead.data?.length === 1);

    const forgedSummary = await volunteer.client.from("applications").insert({ mission_id: missionId, volunteer_id: volunteer.id, fit_summary: "Perfect candidate" });
    check("volunteer cannot write their own AI fit summary", forgedSummary.error !== null, forgedSummary.error?.code);

    const profile = await volunteer.client.from("volunteer_profiles").upsert({ user_id: volunteer.id, first_name: "Camille", city: "Paris" });
    check("volunteer can save their profile", !profile.error, profile.error?.message);

    const application = await volunteer.client
      .from("applications")
      .insert({ mission_id: missionId, volunteer_id: volunteer.id, answers: [{ questionId: "q1", question: "Dispo le mardi ?", answer: "Oui" }] })
      .select("id")
      .single();
    check("volunteer can apply", !application.error, application.error?.message);
    const applicationId = application.data?.id ?? "";

    const impersonate = await stranger.client.from("applications").insert({ mission_id: missionId, volunteer_id: volunteer.id });
    check("stranger cannot apply on someone else's behalf", impersonate.error !== null, impersonate.error?.code);

    const selfAccept = await volunteer.client.from("applications").update({ status: "accepted" }).eq("id", applicationId);
    check("volunteer cannot accept their own application", selfAccept.error !== null, selfAccept.error?.message);

    const ownerView = await owner.client.from("applications").select("id").eq("mission_id", missionId);
    check("owner sees the application", ownerView.data?.length === 1);
    const strangerView = await stranger.client.from("applications").select("id").eq("mission_id", missionId);
    check("stranger sees no applications", strangerView.data?.length === 0);

    const ownerProfileView = await owner.client.from("volunteer_profiles").select("first_name").eq("user_id", volunteer.id);
    check("owner sees the applicant's profile", ownerProfileView.data?.[0]?.first_name === "Camille");
    const strangerProfileView = await stranger.client.from("volunteer_profiles").select("first_name").eq("user_id", volunteer.id);
    check("stranger cannot see the applicant's profile", strangerProfileView.data?.length === 0);

    const ownerWithdraw = await owner.client.from("applications").update({ status: "withdrawn" }).eq("id", applicationId);
    check("owner cannot withdraw on the volunteer's behalf", ownerWithdraw.error !== null, ownerWithdraw.error?.message);
    const accept = await owner.client.from("applications").update({ status: "accepted" }).eq("id", applicationId).select("status");
    check("owner can accept", accept.data?.[0]?.status === "accepted", accept.error?.message);

    const ownerMessage = await owner.client.from("application_messages").insert({ application_id: applicationId, sender_id: owner.id, body: "Bienvenue !" });
    check("owner can message the volunteer", !ownerMessage.error, ownerMessage.error?.message);
    const volunteerMessage = await volunteer.client.from("application_messages").insert({ application_id: applicationId, sender_id: volunteer.id, body: "Merci !" });
    check("volunteer can reply", !volunteerMessage.error, volunteerMessage.error?.message);
    const strangerMessage = await stranger.client.from("application_messages").insert({ application_id: applicationId, sender_id: stranger.id, body: "Spam" });
    check("stranger cannot post in the thread", strangerMessage.error !== null, strangerMessage.error?.code);
    const strangerThread = await stranger.client.from("application_messages").select("id").eq("application_id", applicationId);
    check("stranger cannot read the thread", strangerThread.data?.length === 0);
    const volunteerThread = await volunteer.client.from("application_messages").select("id").eq("application_id", applicationId);
    check("volunteer reads both messages", volunteerThread.data?.length === 2);

    const missionDelete = await owner.client.from("missions").delete().eq("id", missionId);
    check("missions cannot be hard-deleted by clients", missionDelete.error !== null, missionDelete.error?.code);
  } finally {
    for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
    console.log(`cleaned up ${createdUsers.length} test users (organizations, missions and applications cascade)`);
  }
  console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
