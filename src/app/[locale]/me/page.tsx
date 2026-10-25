import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { AnswerList } from "@/features/applications/components/AnswerList";
import { ApplicationThread } from "@/features/applications/components/ApplicationThread";
import { StatusPill } from "@/features/applications/components/StatusPill";
import { WithdrawButton } from "@/features/applications/components/WithdrawButton";
import { getMyApplications, type MyApplicationView } from "@/features/applications/queries";
import { SignInForm } from "@/features/auth/SignInForm";
import { getOwnedOrganization } from "@/features/organizations/queries";
import { SavedMissionsList } from "@/features/space/components/SavedMissionsList";
import { SpaceHeader } from "@/features/space/components/SpaceHeader";
import { StatTiles } from "@/features/space/components/StatTiles";
import { VolunteerProfileCard } from "@/features/volunteers/components/VolunteerProfileCard";
import { getVolunteerProfile } from "@/features/volunteers/queries";
import { PageSkeleton } from "@/features/ui/PageSkeleton";
import { SiteHeader } from "@/features/ui/SiteHeader";
import { CARD, PAGE_TITLE, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/features/ui/styles";
import { Link, redirect } from "@/i18n/navigation";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";

async function SignedOutSpace({ locale }: { locale: string }): Promise<React.ReactElement> {
  const t = await getTranslations("space");
  return (
    <div className="flex flex-col gap-6">
      <h1 className={PAGE_TITLE}>{t("title")}</h1>
      <p className="max-w-[60ch] text-lg text-muted">{t("signInLede")}</p>
      <SignInForm nextPath={`/${locale}/me`} />
      <div className="flex flex-col items-start gap-3 rounded-3xl bg-mist px-5 py-5 sm:px-7">
        <p className="display-title text-xl leading-tight text-ink">{t("assoPrompt")}</p>
        <p className="text-text">{t("assoPromptBody")}</p>
        <Link href="/asso" className={SECONDARY_BUTTON}>
          {t("assoPromptCta")}
        </Link>
      </div>
    </div>
  );
}

async function ApplicationList({ applications }: { applications: MyApplicationView[] }): Promise<React.ReactElement> {
  const t = await getTranslations("me");
  const format = await getFormatter();
  return (
    <ul className="flex flex-col gap-4">
      {applications.map((application) => (
        <li key={application.id} className={`${CARD} flex flex-col gap-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="display-title text-xl leading-tight text-ink">{application.mission.title}</p>
              <p className="text-sm text-muted">
                {[application.mission.organizationName, application.mission.city].filter(Boolean).join(", ")}
              </p>
              <p className="text-xs text-muted">
                {t("sentOn", { date: format.dateTime(new Date(application.createdAt), { day: "numeric", month: "long" }) })}
              </p>
            </div>
            <StatusPill status={application.status} />
          </div>
          <AnswerList answers={application.answers} />
          {application.status !== "withdrawn" && (
            <div className="border-t border-line pt-4">
              <ApplicationThread
                applicationId={application.id}
                messages={application.messages}
                replyLabel={t("reply")}
                otherPartyName={application.mission.organizationName}
              />
            </div>
          )}
          {application.status === "pending" && <WithdrawButton applicationId={application.id} />}
        </li>
      ))}
    </ul>
  );
}

interface VolunteerSpaceProps {
  locale: string;
  /** Set when the visitor picked the volunteer tab, so association owners are not bounced back. */
  explicitTab: boolean;
}

async function VolunteerSpace({ locale, explicitTab }: VolunteerSpaceProps): Promise<React.ReactElement> {
  const t = await getTranslations("space");
  const tMe = await getTranslations("me");
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return <SignedOutSpace locale={locale} />;

  const [applications, profile, organization] = await Promise.all([
    getMyApplications(supabase, user.id),
    getVolunteerProfile(supabase, user.id),
    explicitTab ? null : getOwnedOrganization(supabase, user.id),
  ]);
  if (organization && applications.length === 0) return redirect({ href: "/asso", locale });

  const active = applications.filter((application) => application.status !== "withdrawn");
  return (
    <div className="flex flex-col gap-8">
      <SpaceHeader
        side="volunteer"
        title={profile?.firstName ? t("hello", { name: profile.firstName }) : t("title")}
        email={user.email}
      />

      {active.length > 0 && (
        <StatTiles
          label={t("stats.label")}
          stats={[
            { label: t("stats.sent"), value: active.length },
            { label: t("stats.pending"), value: active.filter((application) => application.status === "pending").length },
            {
              label: t("stats.accepted"),
              value: active.filter((application) => application.status === "accepted").length,
              highlight: true,
            },
          ]}
        />
      )}

      <VolunteerProfileCard profile={profile} />

      <section className="flex flex-col gap-4">
        <h2 className="display-title text-2xl leading-tight text-ink">{tMe("title")}</h2>
        {applications.length === 0 ? (
          <div className={`${CARD} flex flex-col items-start gap-4`}>
            <p className="text-muted">{tMe("empty")}</p>
            <Link href="/" className={PRIMARY_BUTTON}>
              {(await getTranslations("nav"))("home")}
            </Link>
          </div>
        ) : (
          <ApplicationList applications={applications} />
        )}
      </section>

      <SavedMissionsList />
    </div>
  );
}

type MySpaceProps = PageProps<"/[locale]/me">;

async function MySpaceContent({ params, searchParams }: MySpaceProps): Promise<React.ReactElement> {
  const { locale } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);
  return <VolunteerSpace locale={locale} explicitTab={tab === "volunteer"} />;
}

export default function MySpacePage(props: MySpaceProps): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <Suspense fallback={<PageSkeleton />}>
          <MySpaceContent {...props} />
        </Suspense>
      </main>
    </>
  );
}
