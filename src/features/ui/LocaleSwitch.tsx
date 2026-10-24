"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function LocaleSwitch(): React.ReactElement {
  const t = useTranslations("header");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const otherLocale: AppLocale = locale === "fr" ? "en" : "fr";
  return (
    <Link
      href={pathname}
      locale={otherLocale}
      lang={otherLocale}
      aria-label={t("switchLocaleLabel")}
      className="rounded-full px-3 py-1.5 text-ink hover:bg-card"
    >
      {t("switchLocale")}
    </Link>
  );
}
