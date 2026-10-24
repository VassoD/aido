"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { signOutAction } from "@/features/auth/actions";
import { useRouter } from "@/i18n/navigation";

export function SignOutButton(): React.ReactElement {
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
          router.push("/");
          router.refresh();
        })
      }
      className="text-sm text-muted underline underline-offset-4 hover:text-ink"
    >
      {t("signOut")}
    </button>
  );
}
