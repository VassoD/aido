"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";

import { LocaleSwitch } from "@/features/ui/LocaleSwitch";
import { Link } from "@/i18n/navigation";

const NAV_ITEM = "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-ink transition-colors hover:bg-surface";

interface HeaderBarProps {
  /** On the chat page the wordmark starts a new search instead of navigating. */
  onLogoClick?: () => void;
  savedCount?: number;
  onOpenSaved?: () => void;
}

/**
 * One header for every page. On phones the wordmark and language stay on the first row and the
 * navigation becomes a single scrollable row, instead of wrapping into a block.
 */
export function HeaderBar({ onLogoClick, savedCount, onOpenSaved }: HeaderBarProps): React.ReactElement {
  const t = useTranslations("nav");
  const tHeader = useTranslations("header");
  const wordmarkClass = "font-display text-3xl leading-none font-bold tracking-tight text-ink";

  return (
    <header className="mx-auto grid w-full max-w-3xl grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-4 sm:px-6">
      <div className="col-start-1 row-start-1">
        {onLogoClick ? (
          <button type="button" onClick={onLogoClick} className={wordmarkClass}>
            aido
          </button>
        ) : (
          <Link href="/" className={wordmarkClass}>
            aido
          </Link>
        )}
      </div>

      <nav
        aria-label={t("label")}
        className="col-span-3 row-start-2 -mx-4 flex overflow-x-auto px-3 text-sm [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mx-0 sm:justify-end sm:px-0 sm:[mask-image:none]"
      >
        <Link href="/" className={NAV_ITEM}>
          {t("home")}
        </Link>
        <Link href="/me" className={NAV_ITEM}>
          {t("myApplications")}
        </Link>
        <Link href="/asso" className={NAV_ITEM}>
          {t("associations")}
        </Link>
        {onOpenSaved && (
          <button type="button" onClick={onOpenSaved} className={NAV_ITEM}>
            {tHeader("saved", { count: savedCount ?? 0 })}
          </button>
        )}
      </nav>

      <div className="col-start-3 row-start-1 text-sm">
        <Suspense fallback={null}>
          <LocaleSwitch />
        </Suspense>
      </div>
    </header>
  );
}
