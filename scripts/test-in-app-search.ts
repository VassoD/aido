// Confirms a mission posted on Aido is found by the volunteer search and ranked before external ones.
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { searchMissions } from "@/features/missions/search-missions";
import type { Database } from "@/lib/supabase/database.types";

const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});

async function main(): Promise<void> {
  const { data: user } = await admin.auth.admin.createUser({ email: `aido-search-${randomUUID().slice(0, 8)}@example.com`, email_confirm: true });
  const ownerId = user.user?.id ?? "";
  try {
    const { data: org } = await admin
      .from("organizations")
      .insert({ owner_id: ownerId, name: "Refuge Test Paris", national_id: `8${Date.now()}`.slice(0, 9), national_id_type: "siren", verified: true })
      .select("id")
      .single();
    await admin.from("missions").insert({
      organization_id: org?.id ?? "",
      title: "Accueillir un chien du refuge quelques semaines",
      description: "Famille d'accueil temporaire pour des chiens en attente d'adoption, à Paris.",
      city: "Paris 11e Arrondissement",
      postal_code: "75011",
      admin_area_code: "75",
      lat: 48.8589,
      lon: 2.3797,
      commitment: "short-term",
      cause: "animals",
      status: "published",
      published_at: new Date().toISOString(),
      questions: [{ id: "q1", label: "Avez-vous déjà eu un chien ?", kind: "yes_no" }],
    });

    const result = await searchMissions({ location: "Paris", causes: ["animals"], interests: ["chien"] }, "FR");
    if (result.status !== "ok") throw new Error(result.status);
    const top = result.candidates.slice(0, 3);
    for (const candidate of top) console.log(candidate.applyInApp ? "IN-APP " : "external", candidate.title.slice(0, 70));
    console.log(top[0]?.applyInApp ? "PASS  Aido mission ranked first" : "FAIL  Aido mission not first");
  } finally {
    await admin.auth.admin.deleteUser(ownerId);
    console.log("cleaned up");
  }
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
