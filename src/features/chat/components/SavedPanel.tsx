"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { describeDates } from "@/features/chat/format-dates";
import type { SavedMissionsApi } from "@/features/chat/hooks/use-saved-missions";

interface SavedPanelProps {
  open: boolean;
  onClose: () => void;
  savedMissions: SavedMissionsApi;
}

export function SavedPanel({ open, onClose, savedMissions }: SavedPanelProps): React.ReactElement {
  const t = useTranslations("saved");
  const tTicket = useTranslations("ticket");
  const locale = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="saved-title"
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-md bg-paper p-0 text-text backdrop:bg-ink/30"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="saved-title" className="font-display text-2xl font-semibold text-ink">
            {t("title")}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-ink hover:bg-surface">
            {t("close")}
          </button>
        </div>

        {savedMissions.saved.length === 0 ? (
          <p className="px-5 py-6 text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3 overflow-y-auto p-5">
            {savedMissions.saved.map((mission) => {
              const dates = describeDates(mission.startDate, mission.endDate, locale);
              return (
                <li key={mission.id} className="rounded-2xl border border-line bg-surface p-4">
                  <p className="font-display text-lg leading-snug font-semibold text-ink">{mission.title}</p>
                  <p className="text-sm text-muted">
                    {mission.organizationName}
                    {mission.location?.city ? `, ${mission.location.city}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {tTicket(`commitment.${mission.commitment}`)}
                    {dates.kind === "from" && `. ${tTicket("dates.from", { date: dates.date })}`}
                    {dates.kind === "single" && `. ${tTicket("dates.single", { date: dates.date })}`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={mission.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
                    >
                      {tTicket("apply")}
                    </a>
                    <button
                      type="button"
                      onClick={() => savedMissions.remove(mission.id)}
                      className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-ink"
                    >
                      {t("remove")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
}
