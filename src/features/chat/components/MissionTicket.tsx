"use client";

import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";

import { CommitmentScale } from "@/features/chat/components/CommitmentScale";
import { describeDates } from "@/features/chat/format-dates";
import type { Mission } from "@/features/missions/mission";
import { Chevron } from "@/features/ui/Chevron";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/features/ui/styles";

interface MissionTicketProps {
  mission: Mission;
  reason: string;
  firstStep?: string;
  /** 1 for the best match; the badge shrinks with rank. */
  rank: number;
  isSaved: boolean;
  onToggleSave: (mission: Mission) => void;
  onApply: (mission: Mission) => void;
  enterDelayMs: number;
}

const RANK_BADGE = ["size-11 text-xl", "size-9 text-lg", "size-8 text-base"];
const SMALLEST_RANK_BADGE = "size-7 text-sm";

function PinIcon(): React.ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0">
      <path d="M10 18s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="10" cy="8" r="2.2" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon(): React.ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0">
      <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 8.5h14M7 2.5v4M13 2.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** One match: who, where, why it fits you, how much of your month it takes, and what to do next. */
function MissionTicketComponent({
  mission,
  reason,
  firstStep,
  rank,
  isSaved,
  onToggleSave,
  onApply,
  enterDelayMs,
}: MissionTicketProps): React.ReactElement {
  const t = useTranslations("ticket");
  const tApply = useTranslations("apply");
  const tAsso = useTranslations("asso");
  const locale = useLocale();
  const dates = describeDates(mission.startDate, mission.endDate, locale);
  const place = [mission.location?.city, mission.location?.postalCode].filter(Boolean).join(" ");

  const isWebFind = mission.provider === "web";
  const source = mission.attribution.publishedOn ?? "";
  const inApp = mission.inApp;

  const when = [
    dates.kind === "single" && t("dates.single", { date: dates.date }),
    dates.kind === "range" && t("dates.range", { start: dates.start, end: dates.end }),
    dates.kind === "from" && t("dates.from", { date: dates.date }),
    dates.kind === "until" && t("dates.until", { date: dates.date }),
    mission.scheduleText,
  ].filter((entry): entry is string => Boolean(entry));

  const tags = [
    inApp?.organizationVerified && tAsso("verified"),
    mission.engagementType === "civic-service" && t("civicService"),
    mission.skillsBased && t("skillsBased"),
    mission.locationMode !== "onsite" && t(mission.locationMode),
    mission.reducedMobilityAccessible && t("accessible"),
    mission.openToMinors && t("minorsWelcome"),
  ].filter((tag): tag is string => Boolean(tag));

  return (
    <article
      className={`rise-in relative overflow-hidden rounded-3xl bg-card shadow-[0_14px_34px_-24px_rgb(18_38_29/0.45)] ${
        inApp ? "border-2 border-ink" : "border border-line"
      }`}
      style={{ animationDelay: `${enterDelayMs}ms` }}
    >
      {(inApp || isWebFind) && (
        <p
          className={`display-label flex items-center gap-2 px-5 py-2 text-sm sm:px-7 ${
            inApp ? "bg-sun text-ink-deep" : "bg-mist text-ink"
          }`}
        >
          {inApp ? tApply("inAppTag") : t("foundOnWeb")}
        </p>
      )}

      <div className="flex flex-col gap-4 p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={`display-title flex shrink-0 items-center justify-center rounded-full bg-ink text-sun ${
              RANK_BADGE[rank - 1] ?? SMALLEST_RANK_BADGE
            }`}
          >
            {rank}
          </span>
          <div className="min-w-0">
            <h3 className="display-title text-[1.45rem] leading-[1.12] text-ink sm:text-[1.65rem]">{mission.title}</h3>
            <p className="mt-1 font-bold text-muted">{mission.organizationName}</p>
          </div>
        </div>

        <p className="rounded-2xl bg-sun-soft px-4 py-3 text-lg leading-snug text-ink">{reason}</p>

        {firstStep && (
          <p className="text-text">
            <span className="font-bold text-ink">{t("firstStep")}</span> {firstStep}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-3.5">
          <CommitmentScale commitment={mission.commitment} />
          <ul className="flex flex-col gap-1 text-sm text-text">
            {place && (
              <li className="flex items-center gap-1.5">
                <PinIcon />
                {place}
              </li>
            )}
            {when.length > 0 && (
              <li className="flex items-center gap-1.5">
                <CalendarIcon />
                {when.join(", ")}
              </li>
            )}
          </ul>
        </div>

        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {tags.map((tag) => (
              <li key={tag} className="rounded-full bg-leaf-soft px-3 py-0.5 font-bold text-leaf">
                {tag}
              </li>
            ))}
          </ul>
        )}

        {mission.description && (
          <details className="group text-sm">
            <summary className="inline-flex cursor-pointer items-center gap-1.5 font-bold text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink">
              {t("description")}
              <Chevron />
            </summary>
            <p className="mt-2 max-w-[68ch] whitespace-pre-line text-muted">{mission.description}</p>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {inApp ? (
            <button
              type="button"
              onClick={() => onApply(mission)}
              aria-label={tApply("buttonLabel", { title: mission.title })}
              className={PRIMARY_BUTTON}
            >
              {tApply("button")}
            </button>
          ) : (
            <a
              href={mission.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isWebFind ? t("viewPageLabel", { title: mission.title, source }) : t("applyLabel", { title: mission.title })}
              className={SECONDARY_BUTTON}
            >
              {isWebFind ? t("viewPage") : t("apply")}
            </a>
          )}
          <button
            type="button"
            aria-pressed={isSaved}
            onClick={() => onToggleSave(mission)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-bold transition-colors ${
              isSaved ? "bg-leaf-soft text-leaf" : "text-ink hover:bg-mist"
            }`}
          >
            {isSaved && (
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
                <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="check-draw" />
              </svg>
            )}
            {isSaved ? t("saved") : t("save")}
          </button>
          {source && (
            <span className="ml-auto text-xs text-muted">{isWebFind ? t("webSource", { source }) : t("publishedOn", { source })}</span>
          )}
        </div>
      </div>
    </article>
  );
}

export const MissionTicket = memo(MissionTicketComponent);
