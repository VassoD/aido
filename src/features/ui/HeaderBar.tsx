"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";

import { LocaleSwitch } from "@/features/ui/LocaleSwitch";
import { Link } from "@/i18n/navigation";

const NAV_ITEM =
  "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-bold text-ink transition-colors hover:bg-ink hover:text-paper";

interface HeaderBarProps {
  /** On the chat page the wordmark starts a new search instead of navigating. */
  onLogoClick?: () => void;
  savedCount?: number;
  onOpenSaved?: () => void;
}

function Wordmark(): React.ReactElement {
  return (
    <span className="display-title inline-flex items-center gap-1.5 text-[2rem] leading-none text-ink">
      <span aria-hidden="true" className="size-4 rounded-full bg-ink ring-4 ring-sun" />
      aido
    </span>
  );
}

/**
 * Shared header. On phones the wordmark and language stay on the first row and the navigation
 * becomes one scrollable row instead of wrapping.
 */
export function HeaderBar({ onLogoClick, savedCount, onOpenSaved }: HeaderBarProps): React.ReactElement {
  const t = useTranslations("nav");
  const tHeader = useTranslations("header");

  return (
    <header className="mx-auto grid w-full max-w-3xl grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-4 sm:px-6">
      <div className="col-start-1 row-start-1">
        {onLogoClick ? (
          <button type="button" onClick={onLogoClick} aria-label="aido">
            <Wordmark />
          </button>
        ) : (
          <Link href="/" aria-label="aido">
            <Wordmark />
          </Link>
        )}
      </div>

      <nav
        aria-label={t("label")}
        className="col-span-3 row-start-2 -mx-4 flex overflow-x-auto px-2.5 text-sm [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mx-0 sm:justify-end sm:px-0 sm:[mask-image:none]"
      >
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

      <div className="col-start-3 row-start-1 text-sm [&_a]:font-bold">
        <Suspense fallback={null}>
          <LocaleSwitch />
        </Suspense>
      </div>
    </header>
  );
}
