"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { updateApplicationStatusAction } from "@/features/applications/actions";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/features/ui/styles";
import { useRouter } from "@/i18n/navigation";

type ReviewStatus = "accepted" | "declined" | "pending" | "completed";

interface ApplicationStatusControlsProps {
  applicationId: string;
  status: string;
}

const QUIET_LINK = "text-sm text-muted underline underline-offset-4 hover:text-ink";

export function ApplicationStatusControls({ applicationId, status }: ApplicationStatusControlsProps): React.ReactElement {
  const t = useTranslations("applicants");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setStatus = (next: ReviewStatus): void =>
    startTransition(async () => {
      const result = await updateApplicationStatusAction(applicationId, next);
      if (result.ok) router.refresh();
    });

  if (status === "accepted") {
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl bg-leaf-soft px-4 py-3">
        <p className="text-sm text-text">{t("completeHint")}</p>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" disabled={isPending} onClick={() => setStatus("completed")} className={PRIMARY_BUTTON}>
            {t("complete")}
          </button>
          <button type="button" disabled={isPending} onClick={() => setStatus("pending")} className={QUIET_LINK}>
            {t("reset")}
          </button>
        </div>
      </div>
    );
  }
  if (status === "completed") {
    return (
      <button type="button" disabled={isPending} onClick={() => setStatus("accepted")} className={QUIET_LINK}>
        {t("undoComplete")}
      </button>
    );
  }
  if (status !== "pending") {
    return (
      <button type="button" disabled={isPending} onClick={() => setStatus("pending")} className={QUIET_LINK}>
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
