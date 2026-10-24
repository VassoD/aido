"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { createOrganizationAction, lookupOrganizationAction } from "@/features/organizations/actions";
import type { RegisteredOrganization, RegisterLookupResult } from "@/features/organizations/register-lookup";
import { CARD, FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_INPUT } from "@/features/ui/styles";
import { useRouter } from "@/i18n/navigation";

type LookupStatus = Exclude<RegisterLookupResult["status"], "found">;

const STATUS_MESSAGE_KEY: Record<LookupStatus, "invalid" | "notFound" | "inactive" | "notNonprofit" | "unavailable"> = {
  invalid_format: "invalid",
  not_found: "notFound",
  inactive: "inactive",
  not_nonprofit: "notNonprofit",
  unavailable: "unavailable",
};

export function OrganizationOnboarding(): React.ReactElement {
  const t = useTranslations("asso.onboarding");
  const router = useRouter();
  const [nationalId, setNationalId] = useState("");
  const [found, setFound] = useState<RegisteredOrganization | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isChecking, startChecking] = useTransition();
  const [isCreating, startCreating] = useTransition();

  const check = (): void => {
    setMessage(null);
    setFound(null);
    startChecking(async () => {
      const result = await lookupOrganizationAction(nationalId);
      if (!result.ok) return setMessage(t("unavailable"));
      if (result.data.status === "found") return setFound(result.data.organization);
      setMessage(t(STATUS_MESSAGE_KEY[result.data.status]));
    });
  };

  const confirm = (): void => {
    startCreating(async () => {
      const result = await createOrganizationAction(nationalId);
      if (result.ok) return router.refresh();
      setMessage(result.error === "CONFLICT" ? t("conflict") : t("unavailable"));
    });
  };

  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">{t("title")}</h2>
        <p className="mt-1 text-muted">{t("lede")}</p>
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          check();
        }}
      >
        <label htmlFor="national-id" className={FIELD_LABEL}>
          {t("label")}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="national-id"
            value={nationalId}
            onChange={(event) => setNationalId(event.target.value)}
            placeholder="W751218849"
            autoComplete="off"
            className={TEXT_INPUT}
          />
          <button type="submit" disabled={isChecking || nationalId.trim().length < 9} className={`${SECONDARY_BUTTON} shrink-0`}>
            {isChecking ? t("checking") : t("check")}
          </button>
        </div>
      </form>

      {message && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}

      {found && (
        <div className="flex flex-col gap-3 rounded-xl bg-sage-soft p-4">
          <p className="text-sm text-muted">{found.isDemo ? t("demoFound") : t("found")}</p>
          <p className="font-display text-xl font-semibold text-ink">{found.name}</p>
          <p className="text-sm text-text">
            {[found.city, found.postalCode].filter(Boolean).join(" ")}
            {found.isDemo ? "" : `${found.rna ? ` (RNA ${found.rna})` : ""} SIREN ${found.siren}`}
          </p>
          <button type="button" onClick={confirm} disabled={isCreating} className={`${PRIMARY_BUTTON} self-start`}>
            {isCreating ? t("creating") : t("confirm")}
          </button>
        </div>
      )}
    </section>
  );
}
