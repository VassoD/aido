import { useTranslations } from "next-intl";

const STATUS_STYLE = {
  pending: "bg-sun-soft text-ink",
  accepted: "bg-leaf-soft text-ink",
  completed: "bg-leaf text-paper",
  declined: "bg-paper text-muted",
  withdrawn: "bg-paper text-muted",
} as const;

type KnownStatus = keyof typeof STATUS_STYLE;

export function StatusPill({ status }: { status: string }): React.ReactElement {
  const t = useTranslations("applicants.status");
  const known: KnownStatus = status in STATUS_STYLE ? (status as KnownStatus) : "pending";
  return <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_STYLE[known]}`}>{t(known)}</span>;
}
