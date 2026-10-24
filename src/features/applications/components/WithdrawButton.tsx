"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { updateApplicationStatusAction } from "@/features/applications/actions";
import { useRouter } from "@/i18n/navigation";

export function WithdrawButton({ applicationId }: { applicationId: string }): React.ReactElement {
  const t = useTranslations("me");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await updateApplicationStatusAction(applicationId, "withdrawn");
          if (result.ok) router.refresh();
        })
      }
      className="text-sm text-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
    >
      {t("withdraw")}
    </button>
  );
}
