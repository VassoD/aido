import { useTranslations } from "next-intl";

import type { Commitment } from "@/features/missions/mission";

interface CommitmentScaleProps {
  commitment: Commitment;
}

const DAYS_PER_WEEK = 7;
const WEEKS_SHOWN = 4;

/** Days of a four-week calendar a mission fills: one day, a week, two weeks, or the whole month. */
const FILLED_DAYS: Record<Commitment, number> = {
  "one-off": 1,
  "short-term": DAYS_PER_WEEK,
  ongoing: DAYS_PER_WEEK * 2,
  "long-term": DAYS_PER_WEEK * WEEKS_SHOWN,
  unknown: 0,
};

/** How much of your month a mission takes, drawn as a tiny calendar. */
export function CommitmentScale({ commitment }: CommitmentScaleProps): React.ReactElement {
  const t = useTranslations("ticket.commitment");
  const filled = FILLED_DAYS[commitment];
  const label = t(commitment);

  return (
    <div className="flex items-center gap-3">
      <div role="img" aria-label={label} className="grid shrink-0 grid-cols-7 gap-[3px] rounded-lg bg-mist p-1.5">
        {Array.from({ length: DAYS_PER_WEEK * WEEKS_SHOWN }, (_, day) => (
          <span key={day} className={`size-[7px] rounded-full ${day < filled ? "bg-ink" : "bg-line"}`} />
        ))}
      </div>
      <span className="display-label text-[0.95rem] leading-tight text-ink">{label}</span>
    </div>
  );
}
