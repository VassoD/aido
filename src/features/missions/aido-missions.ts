import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { GeoPlace } from "@/features/geo/geocoder";
import { causeSchema, commitmentSchema, type Mission } from "@/features/missions/mission";
import { applicationQuestionSchema } from "@/features/organizations/mission-draft";
import { distanceKm } from "@/features/missions/ranking";
import type { MissionSearchQuery } from "@/features/missions/search-query";
import type { AppSupabaseClient } from "@/lib/supabase/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { logger } from "@/lib/logger";

const MAX_IN_APP_MISSIONS = 200;
const MISSION_COLUMNS =
  "id, title, description, country_code, city, postal_code, admin_area_code, lat, lon, location_mode, commitment, cause, skills, schedule_text, start_date, end_date, places, questions, organization:organizations!inner(id, name, verified)";

let publicClient: AppSupabaseClient | null = null;

/** Anonymous client: only sees published missions, through row level security. */
function getPublicClient(): AppSupabaseClient {
  publicClient ??= createClient(supabaseUrl(), supabasePublishableKey(), { auth: { persistSession: false } });
  return publicClient;
}

const questionsSchema = z.array(applicationQuestionSchema).catch([]);

interface MissionRow {
  id: string;
  title: string;
  description: string;
  country_code: string;
  city: string | null;
  postal_code: string | null;
  admin_area_code: string | null;
  lat: number | null;
  lon: number | null;
  location_mode: string;
  commitment: string;
  cause: string;
  skills: string[];
  schedule_text: string | null;
  start_date: string | null;
  end_date: string | null;
  places: number | null;
  questions: unknown;
  organization: { id: string; name: string; verified: boolean };
}

export function inAppMissionFromRow(row: MissionRow): Mission {
  const locationMode = row.location_mode === "remote" || row.location_mode === "hybrid" ? row.location_mode : "onsite";
  return {
    id: `aido:${row.id}`,
    provider: "aido",
    sourceId: row.id,
    title: row.title,
    description: row.description,
    language: "",
    organizationName: row.organization.name,
    applyUrl: "",
    locationMode,
    location: row.city
      ? {
          city: row.city,
          postalCode: row.postal_code ?? undefined,
          adminAreaCode: row.admin_area_code ?? undefined,
          countryCode: row.country_code,
          lat: row.lat ?? undefined,
          lon: row.lon ?? undefined,
        }
      : null,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    scheduleText: row.schedule_text ?? undefined,
    commitment: commitmentSchema.catch("unknown").parse(row.commitment),
    engagementType: "volunteering",
    causes: [causeSchema.catch("other").parse(row.cause)],
    skillsBased: row.skills.length > 0,
    skills: row.skills,
    places: row.places ?? undefined,
    attribution: { publishedOn: "Aido", via: "aido" },
    inApp: {
      organizationId: row.organization.id,
      organizationVerified: row.organization.verified,
      questions: questionsSchema.parse(row.questions),
    },
  };
}

/** Missions associations published on Aido, filtered to the search area. Failures never block external results. */
export async function searchInAppMissions(
  query: MissionSearchQuery,
  countryCode: string,
  place: GeoPlace | null,
  radiusKm: number,
): Promise<Mission[]> {
  try {
    const { data, error } = await getPublicClient()
      .from("missions")
      .select(MISSION_COLUMNS)
      .eq("status", "published")
      .eq("country_code", countryCode)
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(MAX_IN_APP_MISSIONS)
      .overrideTypes<MissionRow[], { merge: false }>();
    if (error) throw error;

    return (data ?? []).map(inAppMissionFromRow).filter((mission) => {
      if (query.locationMode === "remote") return mission.locationMode !== "onsite";
      if (!place || mission.locationMode === "remote") return true;
      const { lat, lon, adminAreaCode } = mission.location ?? {};
      if (lat !== undefined && lon !== undefined) return distanceKm(place, { lat, lon }) <= radiusKm;
      return adminAreaCode === place.adminAreaCode;
    });
  } catch (error) {
    logger.warn("missions.in_app_search_failed", { error: String(error) });
    return [];
  }
}

export async function getInAppMission(missionId: string): Promise<Mission | null> {
  const { data, error } = await getPublicClient()
    .from("missions")
    .select(MISSION_COLUMNS)
    .eq("id", missionId)
    .eq("status", "published")
    .maybeSingle()
    .overrideTypes<MissionRow, { merge: false }>();
  if (error) {
    logger.warn("missions.in_app_lookup_failed", { missionId, error: error.message });
    return null;
  }
  return data ? inAppMissionFromRow(data) : null;
}
