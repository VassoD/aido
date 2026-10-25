"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { signOutAction } from "@/features/auth/actions";
import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const VARIANT_CLASSES = {
  link: "text-sm text-muted underline underline-offset-4 hover:text-ink",
  pill: "rounded-full border-2 border-line px-3 py-1 font-bold text-ink transition-colors hover:border-ink disabled:opacity-60",
} as const;

interface SignOutButtonProps {
  variant?: keyof typeof VARIANT_CLASSES;
}

export function SignOutButton({ variant = "link" }: SignOutButtonProps): React.ReactElement {
  const t = useTranslations("nav");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await signOutAction();
          // The server cleared the cookies; signing out locally too tells client UI (the header) right away.
          await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
          router.push("/");
          router.refresh();
        })
      }
      className={VARIANT_CLASSES[variant]}
    >
      {t("signOut")}
    </button>
  );
}
