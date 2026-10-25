"use client";

import { useTranslations } from "next-intl";

import { updateOrganizationProfileAction } from "@/features/organizations/actions";
import { EditableCard } from "@/features/space/components/EditableCard";

interface OrganizationProfileCardProps {
  description: string | null;
  website: string | null;
  contactEmail: string | null;
  city: string | null;
}

export function OrganizationProfileCard({
  description,
  website,
  contactEmail,
  city,
}: OrganizationProfileCardProps): React.ReactElement {
  const t = useTranslations("orgProfile");
  return (
    <EditableCard
      title={t("title")}
      hint={t("hint")}
      invalidMessage={t("invalid")}
      save={updateOrganizationProfileAction}
      fields={[
        {
          name: "contactEmail",
          label: t("contactEmail"),
          value: contactEmail ?? "",
          type: "email",
          autoComplete: "email",
          hint: t("contactEmailHint"),
          maxLength: 320,
        },
        { name: "city", label: t("city"), value: city ?? "", autoComplete: "address-level2", maxLength: 120 },
        {
          name: "website",
          label: t("website"),
          value: website ?? "",
          type: "url",
          placeholder: "https://",
          autoComplete: "url",
          maxLength: 300,
        },
        {
          name: "description",
          label: t("description"),
          value: description ?? "",
          type: "textarea",
          placeholder: t("descriptionPlaceholder"),
          hint: t("descriptionHint"),
          maxLength: 2000,
        },
      ]}
    />
  );
}
