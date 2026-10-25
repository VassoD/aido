import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { SignInForm } from "@/features/auth/SignInForm";
import { MissionStatusToggle } from "@/features/organizations/components/MissionStatusToggle";
import { OrganizationProfileCard } from "@/features/organizations/components/OrganizationProfileCard";
import { OrganizationOnboarding } from "@/features/organizations/components/OrganizationOnboarding";
import { VerifiedBadge } from "@/features/organizations/components/VerifiedBadge";
import { getOwnedOrganization, listOrganizationMissions } from "@/features/organizations/queries";
import { SpaceHeader } from "@/features/space/components/SpaceHeader";
import { StatTiles } from "@/features/space/components/StatTiles";
import { PageSkeleton } from "@/features/ui/PageSkeleton";
import { SiteHeader } from "@/features/ui/SiteHeader";
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
      <div className="flex flex-col gap-8">
        <SpaceHeader side="association" title={t("signInTitle")} email={user.email} />
        <p className="max-w-[60ch] text-lg text-muted">{t("pitch")}</p>
        <OrganizationOnboarding />
      </div>
    );
  }

  const missions = await listOrganizationMissions(supabase, organization.id);
  const tSpace = await getTranslations("space");
  const publishedCount = missions.filter((mission) => mission.status === "published").length;
  const applicantCount = missions.reduce((total, mission) => total + mission.applicantCount, 0);
  const pendingCount = missions.reduce((total, mission) => total + mission.pendingCount, 0);

  return (
    <div className="flex flex-col gap-8">
      <SpaceHeader
        side="association"
        title={
          <>
            <h1 className={PAGE_TITLE}>{organization.name}</h1>
            {organization.verified && <VerifiedBadge />}
          </>
        }
        details={organization.city}
        email={user.email}
      />

      {missions.length > 0 && (
        <StatTiles
          label={tSpace("stats.label")}
          stats={[
            { label: tSpace("stats.online"), value: publishedCount },
            { label: tSpace("stats.applications"), value: applicantCount },
            { label: tSpace("stats.toReview"), value: pendingCount, highlight: true },
          ]}
        />
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="display-title text-2xl leading-tight text-ink">{t("dashboard.missions")}</h2>
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
                    className="display-title text-xl leading-tight text-ink underline-offset-4 hover:underline"
                  >
                    {mission.title}
                  </Link>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-0.5 text-sm font-bold ${
                      mission.status === "published" ? "bg-leaf-soft text-leaf" : "bg-mist text-muted"
                    }`}
                  >
                    {mission.status === "published" && <span aria-hidden="true" className="size-2 rounded-full bg-leaf" />}
                    {t(`dashboard.status.${mission.status as "published" | "draft" | "closed"}`)}
                  </span>
                </div>
                <p className="text-sm text-text">
                  {t("dashboard.applicants", { count: mission.applicantCount })}
                  {mission.pendingCount > 0 && (
                    <span className="ml-2 rounded-full bg-sun-soft px-2 py-0.5 font-semibold text-ink">
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

      <OrganizationProfileCard
        description={organization.description}
        website={organization.website}
        contactEmail={organization.contact_email}
        city={organization.city}
      />
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
