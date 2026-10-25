import "server-only";

import type { AppSupabaseClient } from "@/lib/supabase/server";

export interface VolunteerProfile {
  firstName: string | null;
  city: string | null;
  phone: string | null;
  about: string | null;
  linkedinUrl: string | null;
  causes: string[];
  interests: string[];
  skills: string[];
}

export async function getVolunteerProfile(supabase: AppSupabaseClient, userId: string): Promise<VolunteerProfile | null> {
  const { data, error } = await supabase
    .from("volunteer_profiles")
    .select("first_name, city, phone, about, linkedin_url, causes, interests, skills")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    firstName: data.first_name,
    city: data.city,
    phone: data.phone,
    about: data.about,
    linkedinUrl: data.linkedin_url,
    causes: data.causes,
    interests: data.interests,
    skills: data.skills,
  };
}
