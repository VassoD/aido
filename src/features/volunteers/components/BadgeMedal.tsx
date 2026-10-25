import type { Badge } from "@/features/volunteers/badges";

const SIZE = {
  sm: "size-9 text-lg",
  lg: "size-16 text-3xl",
} as const;

interface BadgeMedalProps {
  badge: Badge;
  label: string;
  size?: keyof typeof SIZE;
}

export function BadgeMedal({ badge, label, size = "lg" }: BadgeMedalProps): React.ReactElement {
  const earned = Boolean(badge.earnedAt);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`grid shrink-0 place-items-center rounded-full ${SIZE[size]} ${
        earned
          ? "border-2 border-sun-strong bg-sun-soft shadow-[0_6px_14px_-8px_rgb(18_38_29/0.5)]"
          : "border-2 border-dashed border-line bg-mist"
      }`}
    >
      <span aria-hidden="true" className={earned ? "" : "opacity-35 grayscale"}>
        {badge.icon}
      </span>
    </span>
  );
}
