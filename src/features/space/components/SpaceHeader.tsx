import { getTranslations } from "next-intl/server";

import { SpaceTabs, type SpaceSide } from "@/features/space/components/SpaceTabs";
import { SignOutButton } from "@/features/ui/SignOutButton";
import { PAGE_TITLE } from "@/features/ui/styles";

interface SpaceHeaderProps {
  side: SpaceSide;
  title: React.ReactNode;
  email?: string;
  details?: string | null;
}

export async function SpaceHeader({ side, title, email, details }: SpaceHeaderProps): Promise<React.ReactElement> {
  const t = await getTranslations("space");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold uppercase tracking-wider text-muted">{t("eyebrow")}</p>
        <div className="flex flex-wrap items-center gap-3">
          {typeof title === "string" ? <h1 className={PAGE_TITLE}>{title}</h1> : title}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
          <span>{[details, email ? t("signedInAs", { email }) : null].filter(Boolean).join(" · ")}</span>
          <SignOutButton />
        </p>
      </div>
      <SpaceTabs active={side} />
    </div>
  );
}
