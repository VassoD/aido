import { CAUSES, type Cause } from "@/features/missions/mission";

/** Completed-mission counts that unlock a milestone badge, in order. */
export const MILESTONES = [
  { id: "first-mission", threshold: 1, icon: "⭐" },
  { id: "regular", threshold: 3, icon: "🔥" },
  { id: "pillar", threshold: 5, icon: "🏛️" },
  { id: "legend", threshold: 10, icon: "🏆" },
] as const;

const STARTER = { id: "first-application", icon: "✉️" } as const;

export const CAUSE_ICONS: Record<Exclude<Cause, "other">, string> = {
  solidarity: "🤝",
  education: "📚",
  health: "🩺",
  environment: "🌱",
  animals: "🐾",
  culture: "🎭",
  sport: "⚽",
  digital: "💻",
  humanitarian: "🌍",
  citizenship: "🗳️",
  emergency: "🚑",
  employment: "💼",
  research: "🔬",
};

export type BadgeCause = keyof typeof CAUSE_ICONS;
export type MilestoneId = (typeof MILESTONES)[number]["id"];

export type Badge =
  | { kind: "starter"; id: typeof STARTER.id; icon: string; earnedAt: string | null }
  | { kind: "milestone"; id: MilestoneId; icon: string; threshold: number; earnedAt: string | null }
  | { kind: "cause"; id: `cause-${BadgeCause}`; cause: BadgeCause; icon: string; earnedAt: string | null };

export interface CompletedMission {
  cause: string;
  completedAt: string;
}

export interface BadgeInput {
  firstApplicationAt: string | null;
  completed: CompletedMission[];
  /** Causes the volunteer cares about: their cause badges show as goals before they are earned. */
  causesOfInterest?: readonly string[];
}

export interface BadgeProgress {
  badges: Badge[];
  earnedCount: number;
  completedCount: number;
  next: { id: MilestoneId; remaining: number; ratio: number } | null;
}

function isBadgeCause(cause: string): cause is BadgeCause {
  return cause in CAUSE_ICONS;
}

export function computeBadges({ firstApplicationAt, completed, causesOfInterest = [] }: BadgeInput): BadgeProgress {
  const byDate = [...completed].sort((first, second) => first.completedAt.localeCompare(second.completedAt));

  const firstCompletionByCause = new Map<BadgeCause, string>();
  for (const mission of byDate) {
    if (isBadgeCause(mission.cause) && !firstCompletionByCause.has(mission.cause)) {
      firstCompletionByCause.set(mission.cause, mission.completedAt);
    }
  }

  const goalCauses = causesOfInterest.filter(isBadgeCause).filter((cause) => !firstCompletionByCause.has(cause));
  const shownCauses = CAUSES.filter(
    (cause): cause is BadgeCause => isBadgeCause(cause) && (firstCompletionByCause.has(cause) || goalCauses.includes(cause)),
  );

  const badges: Badge[] = [
    { kind: "starter", id: STARTER.id, icon: STARTER.icon, earnedAt: firstApplicationAt ?? byDate[0]?.completedAt ?? null },
    ...MILESTONES.map(
      (milestone): Badge => ({
        kind: "milestone",
        id: milestone.id,
        icon: milestone.icon,
        threshold: milestone.threshold,
        earnedAt: byDate[milestone.threshold - 1]?.completedAt ?? null,
      }),
    ),
    ...shownCauses.map(
      (cause): Badge => ({
        kind: "cause",
        id: `cause-${cause}`,
        cause,
        icon: CAUSE_ICONS[cause],
        earnedAt: firstCompletionByCause.get(cause) ?? null,
      }),
    ),
  ];

  const nextMilestone = MILESTONES.find((milestone) => milestone.threshold > byDate.length);
  const previousThreshold = [...MILESTONES].reverse().find((milestone) => milestone.threshold <= byDate.length)?.threshold ?? 0;

  return {
    badges,
    earnedCount: badges.filter((badge) => badge.earnedAt).length,
    completedCount: byDate.length,
    next: nextMilestone
      ? {
          id: nextMilestone.id,
          remaining: nextMilestone.threshold - byDate.length,
          ratio: (byDate.length - previousThreshold) / (nextMilestone.threshold - previousThreshold),
        }
      : null,
  };
}
