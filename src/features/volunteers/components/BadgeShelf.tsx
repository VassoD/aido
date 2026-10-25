"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { MILESTONES, type Badge, type BadgeProgress } from "@/features/volunteers/badges";
import { BadgeMedal } from "@/features/volunteers/components/BadgeMedal";
import { useBadgeText } from "@/features/volunteers/hooks/use-badge-text";
import { CARD, PRIMARY_BUTTON } from "@/features/ui/styles";
import { Link } from "@/i18n/navigation";

const SEEN_STORAGE_KEY = "aido.seen-badges.v1";

/** Nothing counts as new until the browser has said what it already saw. */
const SERVER_SNAPSHOT = null;
const NOTHING_SEEN = "[]";
// Read once per page load, so writing the new list does not hide the badges being celebrated right now.
let seenAtLoad: string | undefined;

function getSeenSnapshot(): string {
  if (seenAtLoad === undefined) {
    try {
      seenAtLoad = window.localStorage.getItem(SEEN_STORAGE_KEY) ?? NOTHING_SEEN;
    } catch {
      seenAtLoad = NOTHING_SEEN;
    }
  }
  return seenAtLoad;
}

const subscribeToNothing = (): (() => void) => () => {};

/** Badges earned since the volunteer last opened their space, so each one gets its moment once. */
function useNewlyEarned(badges: Badge[]): Set<string> {
  const seenRaw = useSyncExternalStore(subscribeToNothing, getSeenSnapshot, () => SERVER_SNAPSHOT);
  const earnedKey = badges
    .filter((badge) => badge.earnedAt)
    .map((badge) => badge.id)
    .join(",");

  useEffect(() => {
    try {
      window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(earnedKey ? earnedKey.split(",") : []));
    } catch {
      // Storage unavailable: the "new" marker simply shows again next visit.
    }
  }, [earnedKey]);

  return useMemo(() => {
    if (seenRaw === SERVER_SNAPSHOT || !earnedKey) return new Set<string>();
    let seen: string[] = [];
    try {
      seen = JSON.parse(seenRaw) as string[];
    } catch {
      // Corrupt entry: treat everything as new once.
    }
    return new Set(earnedKey.split(",").filter((id) => !seen.includes(id)));
  }, [seenRaw, earnedKey]);
}

export function BadgeShelf({ progress }: { progress: BadgeProgress }): React.ReactElement {
  const t = useTranslations("badges");
  const format = useFormatter();
  const { name, description } = useBadgeText();
  const fresh = useNewlyEarned(progress.badges);
  const celebrated = progress.badges.find((badge) => fresh.has(badge.id));
  const nextBadge = progress.next && progress.badges.find((badge) => badge.id === progress.next?.id);

  return (
    <section id="badges" aria-labelledby="badges-title" className={`${CARD} flex scroll-mt-24 flex-col gap-5`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="badges-title" className="display-title text-2xl leading-tight text-ink">
            {t("title")}
          </h2>
          <p className="text-sm text-muted">{t("hint")}</p>
        </div>
        <p className="rounded-full bg-mist px-3 py-1 text-sm font-bold text-ink">
          {t("count", { earned: progress.earnedCount, total: progress.badges.length })}
        </p>
      </div>

      {celebrated && (
        <div role="status" className="badge-pop flex items-center gap-4 rounded-2xl bg-sun px-4 py-3 text-ink-deep">
          <BadgeMedal badge={celebrated} label={name(celebrated)} />
          <div>
            <p className="text-sm font-bold uppercase tracking-wider">{t("celebrateEyebrow")}</p>
            <p className="display-title text-xl leading-tight">{name(celebrated)}</p>
            <p className="text-sm">{description(celebrated)}</p>
          </div>
        </div>
      )}

      {progress.next && nextBadge ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p className="font-semibold text-ink">
              {t("next", { remaining: progress.next.remaining, name: name(nextBadge) })}
            </p>
            <p className="text-muted">
              {t("completedCount", { count: progress.completedCount })}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={t("progressLabel", { name: name(nextBadge) })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress.next.ratio * 100)}
            className="h-3 overflow-hidden rounded-full bg-mist"
          >
            <div
              className="h-full rounded-full bg-leaf transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${Math.max(progress.next.ratio * 100, 4)}%` }}
            />
          </div>
          <ol aria-hidden="true" className="flex justify-between text-xs text-muted">
            {MILESTONES.map((milestone) => (
              <li key={milestone.id}>{milestone.threshold}</li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="font-semibold text-ink">{t("allDone")}</p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {progress.badges.map((badge) => (
          <li
            key={badge.id}
            className={`relative flex items-center gap-3 rounded-2xl border p-3 ${
              badge.earnedAt ? "border-line bg-card" : "border-transparent bg-paper"
            }`}
          >
            <BadgeMedal badge={badge} label={name(badge)} size="sm" />
            <div className="min-w-0">
              <p className={`text-sm leading-tight font-bold ${badge.earnedAt ? "text-ink" : "text-muted"}`}>{name(badge)}</p>
              <p className="text-xs leading-snug text-muted">
                {badge.earnedAt
                  ? t("earnedOn", { date: format.dateTime(new Date(badge.earnedAt), { day: "numeric", month: "short" }) })
                  : description(badge)}
              </p>
            </div>
            {fresh.has(badge.id) && (
              <span className="absolute -top-2 right-2 rounded-full bg-coral px-2 py-0.5 text-[0.7rem] font-bold text-paper">
                {t("new")}
              </span>
            )}
          </li>
        ))}
      </ul>

      {progress.completedCount === 0 && (
        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
          <p className="flex-1 text-sm text-text">{t("emptyCta")}</p>
          <Link href="/" className={PRIMARY_BUTTON}>
            {t("findMission")}
          </Link>
        </div>
      )}
    </section>
  );
}
