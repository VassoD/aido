"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { DEFAULT_RADIUS_KM, type MissionSearchQuery } from "@/features/missions/search-query";

interface ProfileStripProps {
  query: MissionSearchQuery;
  disabled: boolean;
  onRemove: (label: string) => void;
}

interface Criterion {
  key: string;
  label: string;
}

function useCriteria(query: MissionSearchQuery): Criterion[] {
  const t = useTranslations("profile");
  const tCauses = useTranslations("causes");
  const criteria: Criterion[] = [];

  if (query.locationMode === "remote") criteria.push({ key: "mode", label: t("remote") });
  if (query.location && query.locationMode !== "remote") criteria.push({ key: "location", label: query.location });
  if (query.radiusKm && query.radiusKm !== DEFAULT_RADIUS_KM && query.locationMode !== "remote") {
    criteria.push({ key: "radius", label: t("radius", { km: query.radiusKm }) });
  }
  if (query.locationMode === "onsite") criteria.push({ key: "mode", label: t("onsite") });
  if (query.availability) criteria.push({ key: "availability", label: query.availability });
  for (const skill of query.skills ?? []) criteria.push({ key: `skill-${skill}`, label: skill });
  for (const interest of query.interests ?? []) criteria.push({ key: `interest-${interest}`, label: interest });
  for (const cause of query.causes ?? []) criteria.push({ key: `cause-${cause}`, label: tCauses(cause) });
  if (query.maxCommitment && query.maxCommitment !== "any") {
    criteria.push({ key: "commitment", label: t(`commitment.${query.maxCommitment}`) });
  }
  for (const type of query.engagementTypes ?? []) {
    criteria.push({ key: `type-${type}`, label: t(`engagement.${type}`) });
  }
  if (query.isMinor) criteria.push({ key: "minor", label: t("minor") });
  if (query.needsAccessibility) criteria.push({ key: "accessibility", label: t("accessibility") });

  return criteria;
}

/**
 * What the assistant understood, as removable tags. Removing one asks Aido to search again without it.
 * Collapsed by default so it does not compete with the conversation.
 */
export function ProfileStrip({ query, disabled, onRemove }: ProfileStripProps): React.ReactElement | null {
  const t = useTranslations("profile");
  const criteria = useCriteria(query);
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  if (criteria.length === 0) return null;

  return (
    <section aria-label={t("title")} className="flex flex-col items-start gap-2">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((open) => !open)}
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
      >
        {t("toggle", { count: criteria.length })}
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={`size-3.5 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <ul
        id={listId}
        hidden={!expanded}
        className="-mx-4 flex gap-2 self-stretch overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {criteria.map((criterion) => (
          <li key={criterion.key} className="shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(criterion.label)}
              aria-label={t("remove", { label: criterion.label })}
              className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-card py-1 pr-2 pl-3 text-sm text-text transition-colors hover:border-ink disabled:opacity-60"
            >
              {criterion.label}
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 text-muted group-hover:text-ink">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
