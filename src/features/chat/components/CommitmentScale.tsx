import { useTranslations } from "next-intl";

import { COMMITMENT_LEVEL, COMMITMENT_SCALE_STEPS } from "@/features/chat/format-dates";
import type { Commitment } from "@/features/missions/mission";

interface CommitmentScaleProps {
  commitment: Commitment;
}

function segmentClass(commitment: Commitment, step: number, level: number): string {
  if (commitment === "unknown") return "border border-dashed border-muted";
  if (step >= level) return "bg-line";
  return commitment === "ongoing" && step === level - 1 ? "bg-marigold opacity-60" : "bg-marigold";
}

/** How much a mission asks of you, as a three-step gauge: once, a few weeks, several months. */
export function CommitmentScale({ commitment }: CommitmentScaleProps): React.ReactElement {
  const t = useTranslations("ticket.commitment");
  const level = COMMITMENT_LEVEL[commitment];
  const label = t(commitment);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1" role="img" aria-label={label}>
        {Array.from({ length: COMMITMENT_SCALE_STEPS }, (_, step) => (
          <span
            key={step}
            className={`h-2.5 w-7 rounded-full ${segmentClass(commitment, step, level)}`}
          />
        ))}
      </div>
      <span className="font-display text-lg leading-tight font-semibold text-ink">{label}</span>
    </div>
  );
}
