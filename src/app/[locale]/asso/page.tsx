import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { SignInForm } from "@/features/auth/SignInForm";
import { MissionStatusToggle } from "@/features/organizations/components/MissionStatusToggle";
import { OrganizationOnboarding } from "@/features/organizations/components/OrganizationOnboarding";
import { VerifiedBadge } from "@/features/organizations/components/VerifiedBadge";
import { getOwnedOrganization, listOrganizationMissions } from "@/features/organizations/queries";
import { PageSkeleton } from "@/features/ui/PageSkeleton";
import { SiteHeader } from "@/features/ui/SiteHeader";
import { SignOutButton } from "@/features/ui/SignOutButton";
import { CARD, PAGE_TITLE, PRIMARY_BUTTON } from "@/features/ui/styles";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";

async function AssociationHome({ locale }: { locale: string }): Promise<React.ReactElement> {
  const t = await getTranslations("asso");
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className={PAGE_TITLE}>{t("signInTitle")}</h1>
        <p className="max-w-[60ch] text-lg text-muted">{t("pitch")}</p>
        <SignInForm nextPath={`/${locale}/asso`} />
      </div>
    );
  }

  const organization = await getOwnedOrganization(supabase, user.id);
  if (!organization) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className={PAGE_TITLE}>{t("signInTitle")}</h1>
        <p className="max-w-[60ch] text-lg text-muted">{t("pitch")}</p>
        <OrganizationOnboarding />
        <SignOutButton />
      </div>
    );
  }

  const missions = await listOrganizationMissions(supabase, organization.id);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className={PAGE_TITLE}>{organization.name}</h1>
          {organization.verified && <VerifiedBadge />}
        </div>
        <p className="text-muted">
          {[organization.city, user.email].filter(Boolean).join(", ")}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("dashboard.missions")}</h2>
          <Link href="/asso/missions/new" className={PRIMARY_BUTTON}>
            {t("dashboard.newMission")}
          </Link>
        </div>

        {missions.length === 0 ? (
          <p className={`${CARD} text-muted`}>{t("dashboard.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {missions.map((mission) => (
              <li key={mission.id} className={`${CARD} flex flex-col gap-2`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link
                    href={`/asso/missions/${mission.id}`}
                    className="font-display text-xl leading-snug font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    {mission.title}
                  </Link>
                  <span className="rounded-full bg-paper px-2.5 py-0.5 text-sm text-muted">
                    {t(`dashboard.status.${mission.status as "published" | "draft" | "closed"}`)}
                  </span>
                </div>
                <p className="text-sm text-text">
                  {t("dashboard.applicants", { count: mission.applicantCount })}
                  {mission.pendingCount > 0 && (
                    <span className="ml-2 rounded-full bg-marigold-soft px-2 py-0.5 font-semibold text-ink">
                      {t("dashboard.pending", { count: mission.pendingCount })}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link href={`/asso/missions/${mission.id}`} className="text-sm font-semibold text-ink underline underline-offset-4">
                    {t("dashboard.view")}
                  </Link>
                  <MissionStatusToggle missionId={mission.id} status={mission.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SignOutButton />
    </div>
  );
}

export default async function AssociationPage({ params }: PageProps<"/[locale]/asso">): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Suspense fallback={<PageSkeleton />}>
          <AssociationHome locale={locale} />
        </Suspense>
      </main>
    </>
  );
}
