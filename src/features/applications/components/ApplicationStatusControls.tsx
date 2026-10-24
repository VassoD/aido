"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { updateApplicationStatusAction } from "@/features/applications/actions";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/features/ui/styles";
import { useRouter } from "@/i18n/navigation";

type ReviewStatus = "accepted" | "declined" | "pending";

interface ApplicationStatusControlsProps {
  applicationId: string;
  status: string;
}

export function ApplicationStatusControls({ applicationId, status }: ApplicationStatusControlsProps): React.ReactElement {
  const t = useTranslations("applicants");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setStatus = (next: ReviewStatus): void =>
    startTransition(async () => {
      const result = await updateApplicationStatusAction(applicationId, next);
      if (result.ok) router.refresh();
    });

  if (status !== "pending") {
    return (
      <button type="button" disabled={isPending} onClick={() => setStatus("pending")} className="text-sm text-muted underline underline-offset-4 hover:text-ink">
        {t("reset")}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={isPending} onClick={() => setStatus("accepted")} className={PRIMARY_BUTTON}>
        {t("accept")}
      </button>
      <button type="button" disabled={isPending} onClick={() => setStatus("declined")} className={SECONDARY_BUTTON}>
        {t("decline")}
      </button>
    </div>
  );
}
