"use client";

import { useTranslations } from "next-intl";

import type { MissionSearchResult } from "@/features/missions/search-missions";
import type { MissionSearchQuery } from "@/features/missions/search-query";

interface SearchStatusProps {
  state: "input-streaming" | "input-available" | "output-available" | "output-error" | string;
  input?: { location?: string; locationMode?: MissionSearchQuery["locationMode"] };
  output?: MissionSearchResult;
}

/** One quiet line telling the person what Aido is doing with their words. */
export function SearchStatus({ state, input, output }: SearchStatusProps): React.ReactElement | null {
  const t = useTranslations("search");

  if (state === "input-streaming" || state === "input-available") {
    const isRemote = input?.locationMode === "remote";
    return (
      <p className="flex items-center gap-2 text-sm text-muted" role="status">
        <span className="size-2 animate-pulse rounded-full bg-marigold motion-reduce:animate-none" aria-hidden="true" />
        {input?.location && !isRemote ? t("runningNear", { place: input.location }) : t("running")}
      </p>
    );
  }

  if (state === "output-error") {
    return <p className="text-sm text-danger">{t("failed")}</p>;
  }

  if (state === "output-available" && output) {
    if (output.status === "location_not_found") {
      return <p className="text-sm text-muted">{t("locationNotFound", { location: output.location })}</p>;
    }
    return (
      <p className="text-sm text-muted">
        {t("done", { count: output.totalFound, place: output.resolvedLocation ?? "none" })}
      </p>
    );
  }

  return null;
}

interface WebSearchStatusProps {
  state: string;
  query?: string;
}

export function WebSearchStatus({ state, query }: WebSearchStatusProps): React.ReactElement | null {
  const t = useTranslations("search");

  if (state === "output-available") {
    return <p className="text-sm text-muted">{query ? t("webDone", { query }) : t("webDoneNoQuery")}</p>;
  }
  if (state === "output-error") return null;
  return (
    <p className="flex items-center gap-2 text-sm text-muted" role="status">
      <span className="size-2 animate-pulse rounded-full bg-sage motion-reduce:animate-none" aria-hidden="true" />
      {t("webRunning")}
    </p>
  );
}
