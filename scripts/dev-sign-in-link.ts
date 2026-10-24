// Development helper: prints a one-time sign-in URL for a throwaway test account, so flows can be
// tested without an email inbox. Uses the admin key; never expose this outside local development.
import { createClient } from "@supabase/supabase-js";

const [, , email = "aido-demo-tester@example.com", next = "/fr/asso", origin = "http://localhost:3000"] = process.argv;
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});

async function main(): Promise<void> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) {
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error) throw created.error;
    return main();
  }
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "magiclink");
  url.searchParams.set("next", next);
  console.log(url.toString());
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
