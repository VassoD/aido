import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export type SpaceSide = "volunteer" | "association";

const TAB = "flex-1 rounded-full px-4 py-2 text-center font-bold transition-colors sm:flex-none sm:px-6";
const ACTIVE_TAB = `${TAB} bg-ink text-paper`;
const IDLE_TAB = `${TAB} text-ink hover:bg-mist`;

/** One account can volunteer and run an association, so both sides of the space sit behind the same switch. */
export async function SpaceTabs({ active }: { active: SpaceSide }): Promise<React.ReactElement> {
  const t = await getTranslations("space.tabs");
  return (
    <nav aria-label={t("label")} className="flex w-full rounded-full border-2 border-ink bg-card p-1 sm:w-fit">
      <Link
        href={{ pathname: "/me", query: { tab: "volunteer" } }}
        aria-current={active === "volunteer" ? "page" : undefined}
        className={active === "volunteer" ? ACTIVE_TAB : IDLE_TAB}
      >
        {t("volunteer")}
      </Link>
      <Link
        href="/asso"
        aria-current={active === "association" ? "page" : undefined}
        className={active === "association" ? ACTIVE_TAB : IDLE_TAB}
      >
        {t("association")}
      </Link>
    </nav>
  );
}
