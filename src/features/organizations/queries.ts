import "server-only";

import type { Tables } from "@/lib/supabase/database.types";
import type { AppSupabaseClient } from "@/lib/supabase/server";

export type Organization = Tables<"organizations">;

export async function getOwnedOrganization(supabase: AppSupabaseClient, userId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface MissionSummary {
  id: string;
  title: string;
  status: string;
  city: string | null;
  commitment: string;
  publishedAt: string | null;
  applicantCount: number;
  pendingCount: number;
}

export async function listOrganizationMissions(supabase: AppSupabaseClient, organizationId: string): Promise<MissionSummary[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("id, title, status, city, commitment, published_at, applications(status)")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((mission) => ({
    id: mission.id,
    title: mission.title,
    status: mission.status,
    city: mission.city,
    commitment: mission.commitment,
    publishedAt: mission.published_at,
    applicantCount: mission.applications.filter((application) => application.status !== "withdrawn").length,
    pendingCount: mission.applications.filter((application) => application.status === "pending").length,
  }));
}
