import { useTranslations } from "next-intl";

import type { ApplicantView } from "@/features/applications/queries";
import { causeSchema, type Cause } from "@/features/missions/mission";
import { BadgeMedal } from "@/features/volunteers/components/BadgeMedal";
import { useBadgeText } from "@/features/volunteers/hooks/use-badge-text";

const MAX_SHOWN_CAUSES = 4;

/** What an association sees of a volunteer beyond the application: track record, skills, LinkedIn. */
export function ApplicantProfile({ volunteer }: { volunteer: ApplicantView["volunteer"] }): React.ReactElement {
  const t = useTranslations("applicants");
  const tCauses = useTranslations("causes");
  const { name } = useBadgeText();
  const earned = volunteer.badges.badges.filter((badge) => badge.earnedAt && badge.kind !== "starter");
  const causes = volunteer.causes
    .filter((cause): cause is Cause => causeSchema.safeParse(cause).success)
    .slice(0, MAX_SHOWN_CAUSES);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-ink">{t("trackRecord", { count: volunteer.badges.completedCount })}</p>
        {earned.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {earned.map((badge) => (
              <li key={badge.id}>
                <BadgeMedal badge={badge} label={name(badge)} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {volunteer.skills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm text-muted">{t("skills")}</span>
          {volunteer.skills.map((skill) => (
            <span key={skill} className="rounded-full bg-leaf-soft px-2.5 py-0.5 text-sm text-ink">
              {skill}
            </span>
          ))}
        </div>
      )}

      {causes.length > 0 && (
        <p className="text-sm text-muted">
          {t("cares", { causes: causes.map((cause) => tCauses(cause)).join(", ") })}
        </p>
      )}

      {volunteer.linkedinUrl && (
        <a
          href={volunteer.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-ink underline underline-offset-4"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 text-[#0a66c2]">
            <path
              fill="currentColor"
              d="M13.6 0H2.4A2.4 2.4 0 0 0 0 2.4v11.2A2.4 2.4 0 0 0 2.4 16h11.2a2.4 2.4 0 0 0 2.4-2.4V2.4A2.4 2.4 0 0 0 13.6 0ZM4.9 13.4H2.6V6h2.3v7.4ZM3.7 5a1.3 1.3 0 1 1 0-2.7 1.3 1.3 0 0 1 0 2.7Zm9.7 8.4h-2.3V9.8c0-.9 0-2-1.2-2s-1.4.9-1.4 1.9v3.7H6.2V6h2.2v1h.1c.3-.6 1.1-1.2 2.2-1.2 2.4 0 2.8 1.6 2.8 3.6v4Z"
            />
          </svg>
          {t("linkedin")}
        </a>
      )}
    </div>
  );
}
