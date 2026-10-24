import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { SignInForm } from "@/features/auth/SignInForm";
import { MissionComposer } from "@/features/organizations/components/MissionComposer";
import { getOwnedOrganization } from "@/features/organizations/queries";
import { PageSkeleton } from "@/features/ui/PageSkeleton";
import { SiteHeader } from "@/features/ui/SiteHeader";
import { PAGE_TITLE } from "@/features/ui/styles";
import { redirect } from "@/i18n/navigation";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";

async function ComposerGate({ locale }: { locale: string }): Promise<React.ReactElement> {
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return <SignInForm nextPath={`/${locale}/asso/missions/new`} />;
  const organization = await getOwnedOrganization(supabase, user.id);
  if (!organization) return redirect({ href: "/asso", locale });
  return <MissionComposer />;
}

export default async function NewMissionPage({ params }: PageProps<"/[locale]/asso/missions/new">): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("missionComposer");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className={PAGE_TITLE}>{t("title")}</h1>
          <p className="max-w-[62ch] text-lg text-muted">{t("lede")}</p>
        </div>
        <Suspense fallback={<PageSkeleton />}>
          <ComposerGate locale={locale} />
        </Suspense>
      </main>
    </>
  );
}
