export interface StatTile {
  label: string;
  value: number;
  /** Draws the eye to something waiting on the user. */
  highlight?: boolean;
}

export function StatTiles({ label, stats }: { label: string; stats: StatTile[] }): React.ReactElement {
  return (
    <dl aria-label={label} className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`flex flex-col-reverse justify-end gap-0.5 rounded-2xl border px-3 py-3 sm:px-5 sm:py-4 ${
            stat.highlight && stat.value > 0 ? "border-sun bg-sun-soft" : "border-line bg-card"
          }`}
        >
          <dt className="text-sm leading-snug text-muted">{stat.label}</dt>
          <dd className="display-title text-3xl leading-none text-ink sm:text-4xl">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
