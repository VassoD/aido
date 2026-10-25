"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";

import { useSessionUserId } from "@/features/auth/hooks/use-session-user-id";
import { LocaleSwitch } from "@/features/ui/LocaleSwitch";
import { SignOutButton } from "@/features/ui/SignOutButton";
import { Link, usePathname } from "@/i18n/navigation";

const NAV_ITEM_BASE = "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-bold transition-colors";
const NAV_ITEM = `${NAV_ITEM_BASE} text-ink hover:bg-ink hover:text-paper`;
const NAV_ITEM_ACTIVE = `${NAV_ITEM_BASE} bg-ink text-paper`;

/** Only shows when the row can overflow, otherwise it would fade the last item for nothing. */
const NAV_OVERFLOW_FADE = "[mask-image:linear-gradient(to_right,black_85%,transparent)] md:[mask-image:none]";

interface NavLinkConfig {
  href: "/" | "/me" | "/asso";
  labelKey: "home" | "mySpace" | "associations";
  /** Shorter label on phones, so the whole row fits without scrolling. */
  shortLabelKey?: "homeShort";
  isActive: (pathname: string) => boolean;
}

const NAV_LINKS: readonly NavLinkConfig[] = [
  { href: "/", labelKey: "home", shortLabelKey: "homeShort", isActive: (pathname) => pathname === "/" },
  { href: "/me", labelKey: "mySpace", isActive: (pathname) => pathname.startsWith("/me") },
  { href: "/asso", labelKey: "associations", isActive: (pathname) => pathname.startsWith("/asso") },
];

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

/** Without a pathname (while it resolves) no item is highlighted, so the links never disappear. */
function NavLinks({ pathname }: { pathname: string | null }): React.ReactElement {
  const t = useTranslations("nav");
  return (
    <>
      {NAV_LINKS.map(({ href, labelKey, shortLabelKey, isActive }) => {
        const active = pathname !== null && isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={active ? NAV_ITEM_ACTIVE : NAV_ITEM}
          >
            {shortLabelKey ? (
              <>
                <span className="sm:hidden">{t(shortLabelKey)}</span>
                <span className="hidden sm:inline">{t(labelKey)}</span>
              </>
            ) : (
              t(labelKey)
            )}
          </Link>
        );
      })}
    </>
  );
}

function CurrentNavLinks(): React.ReactElement {
  return <NavLinks pathname={usePathname()} />;
}

function HeaderSignOut(): React.ReactElement | null {
  return useSessionUserId() !== null ? <SignOutButton variant="pill" /> : null;
}

/**
 * Shared header. Below tablet width the wordmark and language stay on the first row and the
 * navigation becomes one scrollable row instead of wrapping or crowding the wordmark.
 */
export function HeaderBar({ onLogoClick, savedCount = 0, onOpenSaved }: HeaderBarProps): React.ReactElement {
  const t = useTranslations("nav");
  const tHeader = useTranslations("header");
  // An empty "Saved (0)" is noise; the entry appears once something is saved.
  const showSaved = onOpenSaved !== undefined && savedCount > 0;

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
        className={`col-span-3 row-start-2 -mx-4 flex gap-1 overflow-x-auto px-2.5 text-sm [scrollbar-width:none] sm:-mx-6 sm:px-4.5 md:col-span-1 md:col-start-2 md:row-start-1 md:mx-0 md:justify-end md:px-0 ${showSaved ? NAV_OVERFLOW_FADE : ""}`}
      >
        <Suspense fallback={<NavLinks pathname={null} />}>
          <CurrentNavLinks />
        </Suspense>
        {showSaved && (
          <button type="button" onClick={onOpenSaved} className={NAV_ITEM}>
            {tHeader("saved", { count: savedCount })}
          </button>
        )}
      </nav>

      <div className="col-start-3 row-start-1 flex items-center gap-2 text-sm [&_a]:font-bold md:ml-2">
        <HeaderSignOut />
        <Suspense fallback={null}>
          <LocaleSwitch />
        </Suspense>
      </div>
    </header>
  );
}
