"use client";

import { useLocale, useTranslations } from "next-intl";

import { describeDates } from "@/features/chat/format-dates";
import { useSavedMissions } from "@/features/chat/hooks/use-saved-missions";
import { CARD } from "@/features/ui/styles";

/** Saved missions are kept per browser, so this list renders on the client only. */
export function SavedMissionsList(): React.ReactElement {
  const t = useTranslations("space");
  const tSaved = useTranslations("saved");
  const tTicket = useTranslations("ticket");
  const locale = useLocale();
  const { saved, remove } = useSavedMissions();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="display-title text-2xl leading-tight text-ink">{t("saved")}</h2>
        <p className="text-sm text-muted">{t("savedHint")}</p>
      </div>
      {saved.length === 0 ? (
        <p className={`${CARD} text-muted`}>{t("savedEmpty")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {saved.map((mission) => {
            const dates = describeDates(mission.startDate, mission.endDate, locale);
            return (
              <li key={mission.id} className="flex flex-col gap-1 rounded-2xl border border-line bg-card p-4">
                <p className="display-title text-lg leading-tight text-ink">{mission.title}</p>
                <p className="text-sm text-muted">
                  {[mission.organizationName, mission.location?.city].filter(Boolean).join(", ")}
                </p>
                <p className="text-sm text-muted">
                  {tTicket(`commitment.${mission.commitment}`)}
                  {dates.kind === "from" && `. ${tTicket("dates.from", { date: dates.date })}`}
                  {dates.kind === "single" && `. ${tTicket("dates.single", { date: dates.date })}`}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-4 pt-2">
                  {mission.applyUrl && (
                    <a
                      href={mission.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
                    >
                      {tTicket("apply")}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(mission.id)}
                    className="text-sm text-muted underline underline-offset-4 hover:text-ink"
                  >
                    {tSaved("remove")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
