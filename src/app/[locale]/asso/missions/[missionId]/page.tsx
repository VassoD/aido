import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { AnswerList } from "@/features/applications/components/AnswerList";
import { ApplicationStatusControls } from "@/features/applications/components/ApplicationStatusControls";
import { ApplicationThread } from "@/features/applications/components/ApplicationThread";
import { StatusPill } from "@/features/applications/components/StatusPill";
import { getMissionApplicants } from "@/features/applications/queries";
import { SignInForm } from "@/features/auth/SignInForm";
import { PageSkeleton } from "@/features/ui/PageSkeleton";
import { Chevron } from "@/features/ui/Chevron";
import { SiteHeader } from "@/features/ui/SiteHeader";
import { CARD, PAGE_TITLE, SECONDARY_BUTTON } from "@/features/ui/styles";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";

interface ApplicantsProps {
  locale: string;
  missionId: string;
  justPublished: boolean;
}

async function Applicants({ locale, missionId, justPublished }: ApplicantsProps): Promise<React.ReactElement> {
  const t = await getTranslations("applicants");
  const tCommitment = await getTranslations("ticket.commitment");
  const tKinds = await getTranslations("missionComposer.questionKinds");
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return <SignInForm nextPath={`/${locale}/asso/missions/${missionId}`} />;

  const result = /^[0-9a-f-]{36}$/i.test(missionId) ? await getMissionApplicants(supabase, missionId, user.id) : null;
  if (!result) return <p className="text-muted">{(await getTranslations("errors"))("NOT_FOUND")}</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/asso" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
          {t("back")}
        </Link>
        <h1 className={PAGE_TITLE}>{result.mission.title}</h1>
      </div>

      {justPublished && (
        <div role="status" className="flex flex-col items-start gap-3 rounded-2xl bg-sage-soft px-5 py-4">
          <p className="font-display text-xl font-semibold text-ink">{t("publishedTitle")}</p>
          <p className="text-text">
            {result.mission.city ? t("publishedBody", { city: result.mission.city }) : t("publishedBodyNoCity")}
          </p>
          <Link href="/" className={SECONDARY_BUTTON}>
            {t("tryIt")}
          </Link>
        </div>
      )}

      <details open={justPublished} className={`${CARD} group`}>
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-display text-xl font-semibold text-ink">
          {t("missionTitle")}
          <Chevron className="text-muted" />
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-muted">
            {[
              result.mission.city,
              tCommitment(result.mission.commitment as "one-off" | "short-term" | "long-term" | "ongoing" | "unknown"),
              result.mission.scheduleText,
              result.mission.places ? t("places", { count: result.mission.places }) : null,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p className="whitespace-pre-line text-text">{result.mission.description}</p>
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <h3 className="font-semibold text-ink">{t("formTitle")}</h3>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 marker:text-muted">
              {result.mission.questions.map((question) => (
                <li key={question.id} className="text-text">
                  {question.label} <span className="text-sm text-muted">({tKinds(question.kind as "short" | "long" | "yes_no")})</span>
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted">{t("formHint")}</p>
          </div>
        </div>
      </details>

      <h2 className="font-display text-2xl font-semibold text-ink">{t("applicationsTitle")}</h2>
      {result.applicants.length === 0 ? (
        <p className={`${CARD} text-muted`}>{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {result.applicants.map((applicant) => (
            <li key={applicant.id} className={`${CARD} flex flex-col gap-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-semibold text-ink">
                    {applicant.volunteer.firstName ?? applicant.volunteer.email}
                  </p>
                  <p className="text-sm text-muted">
                    {[applicant.volunteer.city, applicant.volunteer.email, applicant.volunteer.phone].filter(Boolean).join(", ")}
                  </p>
                </div>
                <StatusPill status={applicant.status} />
              </div>

              {applicant.fitSummary && (
                <div className="rounded-xl bg-marigold-soft px-4 py-3">
                  <p className="text-sm font-semibold text-ink">{t("fit")}</p>
                  <p className="text-text">{applicant.fitSummary}</p>
                </div>
              )}

              <AnswerList answers={applicant.answers} />

              {applicant.motivation && (
                <div>
                  <p className="text-sm text-muted">{t("motivation")}</p>
                  <p className="whitespace-pre-line text-text">{applicant.motivation}</p>
                </div>
              )}

              <ApplicationStatusControls applicationId={applicant.id} status={applicant.status} />

              <div className="border-t border-line pt-4">
                <ApplicationThread
                  applicationId={applicant.id}
                  messages={applicant.messages}
                  replyLabel={t("reply")}
                  otherPartyName={applicant.volunteer.firstName ?? ""}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type MissionPageProps = PageProps<"/[locale]/asso/missions/[missionId]">;

/** The mission id only exists at request time, so the whole page streams in behind one boundary. */
async function MissionApplicantsContent({ params, searchParams }: MissionPageProps): Promise<React.ReactElement> {
  const { locale, missionId } = await params;
  const { published } = await searchParams;
  setRequestLocale(locale);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Applicants locale={locale} missionId={missionId} justPublished={published === "1"} />
      </main>
    </>
  );
}

export default function MissionApplicantsPage(props: MissionPageProps): React.ReactElement {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-20 sm:px-6">
          <PageSkeleton />
        </main>
      }
    >
      <MissionApplicantsContent {...props} />
    </Suspense>
  );
}
