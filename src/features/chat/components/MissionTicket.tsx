"use client";

import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";

import { CommitmentScale } from "@/features/chat/components/CommitmentScale";
import { Chevron } from "@/features/ui/Chevron";
import { describeDates } from "@/features/chat/format-dates";
import type { Mission } from "@/features/missions/mission";

interface MissionTicketProps {
  mission: Mission;
  reason: string;
  firstStep?: string;
  isSaved: boolean;
  onToggleSave: (mission: Mission) => void;
  onApply: (mission: Mission) => void;
  enterDelayMs: number;
}

function MissionTicketComponent({
  mission,
  reason,
  firstStep,
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
  const tags = [
    inApp && tApply("inAppTag"),
    inApp?.organizationVerified && tAsso("verified"),
    isWebFind && t("foundOnWeb"),
    mission.engagementType === "civic-service" && t("civicService"),
    mission.skillsBased && t("skillsBased"),
    mission.reducedMobilityAccessible && t("accessible"),
    mission.openToMinors && t("minorsWelcome"),
  ].filter((tag): tag is string => Boolean(tag));

  return (
    <article
      className="ticket-enter grid overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-[1fr_15rem]"
      style={{ animationDelay: `${enterDelayMs}ms` }}
    >
      <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-6">
        <div>
          <h3 className="font-display text-xl leading-snug font-semibold text-ink sm:text-[1.375rem]">{mission.title}</h3>
          <p className="mt-1 text-muted">
            {mission.organizationName}
            {place && <span className="text-muted">, {place}</span>}
          </p>
        </div>

        <p className="rounded-xl bg-marigold-soft px-3.5 py-2.5 text-text">{reason}</p>

        {firstStep && (
          <p className="text-sm text-text">
            <span className="font-semibold text-ink">{t("firstStep")}</span> {firstStep}
          </p>
        )}

        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag} className="rounded-full bg-sage-soft px-3 py-0.5 text-sm text-text">
                {tag}
              </li>
            ))}
          </ul>
        )}

        {mission.description && (
          <details className="group text-sm">
            <summary className="inline-flex cursor-pointer items-center gap-1.5 text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
              {t("description")}
              <Chevron />
            </summary>
            <p className="mt-2 whitespace-pre-line text-muted">{mission.description}</p>
          </details>
        )}

        {source && (
          <p className="mt-auto text-xs text-muted">
            {isWebFind ? t("webSource", { source }) : t("publishedOn", { source })}
          </p>
        )}
      </div>

      <div className="ticket-perforation flex flex-col justify-between gap-4 bg-paper/60 p-5 sm:p-6">
        <div className="flex flex-col gap-3">
          <CommitmentScale commitment={mission.commitment} />
          <div className="text-sm text-muted">
            {dates.kind === "single" && <p>{t("dates.single", { date: dates.date })}</p>}
            {dates.kind === "range" && <p>{t("dates.range", { start: dates.start, end: dates.end })}</p>}
            {dates.kind === "from" && <p>{t("dates.from", { date: dates.date })}</p>}
            {dates.kind === "until" && <p>{t("dates.until", { date: dates.date })}</p>}
            {mission.scheduleText && <p>{mission.scheduleText}</p>}
            {mission.locationMode !== "onsite" && <p>{t(mission.locationMode)}</p>}
          </div>
        </div>

        <div className="flex gap-2 sm:flex-col">
          {inApp ? (
            <button
              type="button"
              onClick={() => onApply(mission)}
              aria-label={tApply("buttonLabel", { title: mission.title })}
              className="flex-1 whitespace-nowrap rounded-full bg-marigold px-4 py-2.5 text-center font-semibold text-ink transition-opacity hover:opacity-90"
            >
              {tApply("button")}
            </button>
          ) : (
          <a
            href={mission.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
              isWebFind ? t("viewPageLabel", { title: mission.title, source }) : t("applyLabel", { title: mission.title })
            }
            className="flex-1 rounded-full bg-ink px-4 py-2.5 text-center font-semibold text-paper transition-colors hover:bg-ink/90"
          >
            {isWebFind ? t("viewPage") : t("apply")}
          </a>
          )}
          <button
            type="button"
            aria-pressed={isSaved}
            onClick={() => onToggleSave(mission)}
            className={`flex-1 rounded-full border px-4 py-2.5 font-semibold transition-colors ${
              isSaved ? "border-marigold bg-marigold-soft text-ink" : "border-line text-ink hover:border-ink"
            }`}
          >
            {isSaved ? t("saved") : t("save")}
          </button>
        </div>
      </div>
    </article>
  );
}

export const MissionTicket = memo(MissionTicketComponent);
