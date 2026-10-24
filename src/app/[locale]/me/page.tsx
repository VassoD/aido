import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { AnswerList } from "@/features/applications/components/AnswerList";
import { ApplicationThread } from "@/features/applications/components/ApplicationThread";
import { StatusPill } from "@/features/applications/components/StatusPill";
import { WithdrawButton } from "@/features/applications/components/WithdrawButton";
import { getMyApplications } from "@/features/applications/queries";
import { SignInForm } from "@/features/auth/SignInForm";
import { PageSkeleton } from "@/features/ui/PageSkeleton";
import { SiteHeader } from "@/features/ui/SiteHeader";
import { SignOutButton } from "@/features/ui/SignOutButton";
import { CARD, PAGE_TITLE, PRIMARY_BUTTON } from "@/features/ui/styles";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";

async function MyApplications({ locale }: { locale: string }): Promise<React.ReactElement> {
  const t = await getTranslations("me");
  const format = await getFormatter();
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return <SignInForm nextPath={`/${locale}/me`} />;

  const applications = await getMyApplications(supabase, user.id);
  if (applications.length === 0) {
    return (
      <div className={`${CARD} flex flex-col items-start gap-4`}>
        <p className="text-muted">{t("empty")}</p>
        <Link href="/" className={PRIMARY_BUTTON}>
          {(await getTranslations("nav"))("home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {applications.map((application) => (
          <li key={application.id} className={`${CARD} flex flex-col gap-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl leading-snug font-semibold text-ink">{application.mission.title}</p>
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
      <SignOutButton />
    </div>
  );
}

export default async function MyApplicationsPage({ params }: PageProps<"/[locale]/me">): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("me");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className={PAGE_TITLE}>{t("title")}</h1>
        <Suspense fallback={<PageSkeleton />}>
          <MyApplications locale={locale} />
        </Suspense>
      </main>
    </>
  );
}
