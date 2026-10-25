import { useTranslations } from "next-intl";

import type { Badge } from "@/features/volunteers/badges";

interface BadgeText {
  name: (badge: Badge) => string;
  description: (badge: Badge) => string;
}

/** Badge names and descriptions, shared by the volunteer's shelf and the association's applicant card. */
export function useBadgeText(): BadgeText {
  const t = useTranslations("badges");
  const tCauses = useTranslations("causes");
  return {
    name: (badge) => (badge.kind === "cause" ? t(`causeNames.${badge.cause}`) : t(`items.${badge.id}.name`)),
    description: (badge) =>
      badge.kind === "cause" ? t("causeDescription", { cause: tCauses(badge.cause) }) : t(`items.${badge.id}.description`),
  };
}
