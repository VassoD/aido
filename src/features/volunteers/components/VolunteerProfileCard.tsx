"use client";

import { useTranslations } from "next-intl";

import { EditableCard } from "@/features/space/components/EditableCard";
import { updateVolunteerProfileAction } from "@/features/volunteers/actions";
import type { VolunteerProfile } from "@/features/volunteers/queries";

export function VolunteerProfileCard({ profile }: { profile: VolunteerProfile | null }): React.ReactElement {
  const t = useTranslations("volunteerProfile");
  return (
    <EditableCard
      title={t("title")}
      hint={t("hint")}
      save={updateVolunteerProfileAction}
      fields={[
        { name: "firstName", label: t("firstName"), value: profile?.firstName ?? "", autoComplete: "given-name", maxLength: 80 },
        { name: "city", label: t("city"), value: profile?.city ?? "", autoComplete: "address-level2", maxLength: 120 },
        {
          name: "phone",
          label: t("phone"),
          value: profile?.phone ?? "",
          type: "tel",
          autoComplete: "tel",
          hint: t("phoneHint"),
          maxLength: 40,
        },
        {
          name: "about",
          label: t("about"),
          value: profile?.about ?? "",
          type: "textarea",
          placeholder: t("aboutPlaceholder"),
          maxLength: 1500,
        },
      ]}
    />
  );
}
