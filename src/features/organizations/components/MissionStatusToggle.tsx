"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { setMissionStatusAction } from "@/features/organizations/actions";
import { useRouter } from "@/i18n/navigation";

interface MissionStatusToggleProps {
  missionId: string;
  status: string;
}

export function MissionStatusToggle({ missionId, status }: MissionStatusToggleProps): React.ReactElement | null {
  const t = useTranslations("asso.dashboard");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  if (status !== "published" && status !== "closed") return null;

  const next = status === "published" ? "closed" : "published";
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await setMissionStatusAction(missionId, next);
          if (result.ok) router.refresh();
        })
      }
      className="text-sm text-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
    >
      {status === "published" ? t("close") : t("reopen")}
    </button>
  );
}
