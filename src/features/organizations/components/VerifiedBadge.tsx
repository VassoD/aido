import { useTranslations } from "next-intl";

export function VerifiedBadge(): React.ReactElement {
  const t = useTranslations("asso");
  return (
    <span
      title={t("verifiedHint")}
      className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-2.5 py-0.5 text-sm font-semibold text-ink"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 text-sage">
        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t("verified")}
    </span>
  );
}
