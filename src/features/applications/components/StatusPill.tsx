import { useTranslations } from "next-intl";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-marigold-soft text-ink",
  accepted: "bg-sage-soft text-ink",
  declined: "bg-paper text-muted",
  withdrawn: "bg-paper text-muted",
};

export function StatusPill({ status }: { status: string }): React.ReactElement {
  const t = useTranslations("applicants.status");
  const known = status in STATUS_STYLE ? (status as "pending" | "accepted" | "declined" | "withdrawn") : "pending";
  return <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_STYLE[known]}`}>{t(known)}</span>;
}
