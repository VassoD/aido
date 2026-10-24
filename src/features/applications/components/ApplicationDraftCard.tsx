"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { submitApplicationAction } from "@/features/applications/actions";
import { SignInForm } from "@/features/auth/SignInForm";
import { clearDraftEdits, readDraftEdits, stashDraftEdits, type DraftEdits } from "@/features/chat/chat-persistence";
import type { ApplicationDraftOutput } from "@/features/matching/matching-agent";
import { FIELD_LABEL, TEXT_INPUT } from "@/features/ui/styles";
import { Link } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SendState = "idle" | "needs-sign-in" | "sent" | "conflict" | "error";

interface ApplicationDraftCardProps {
  draft: ApplicationDraftOutput;
  /** Saves the conversation before the sign-in email, so this card comes back after the link. */
  onBeforeSignIn: () => void;
}

function initialEdits(draft: ApplicationDraftOutput): DraftEdits {
  return {
    firstName: draft.firstName ?? "",
    city: draft.city ?? "",
    motivation: draft.motivation ?? "",
    answers: Object.fromEntries(draft.answers.map((entry) => [entry.questionId, entry.answer ?? ""])),
  };
}

/** The application Aido wrote from the conversation. The volunteer edits in place and sends it themselves. */
export function ApplicationDraftCard({ draft, onBeforeSignIn }: ApplicationDraftCardProps): React.ReactElement {
  const t = useTranslations("apply");
  const locale = useLocale();
  const mission = draft.mission;
  // Chat cards only render in the browser, so storage is available here.
  const [edits, setEdits] = useState<DraftEdits>(
    () => (mission ? readDraftEdits(mission.sourceId) : null) ?? initialEdits(draft),
  );
  const [state, setState] = useState<SendState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();

  if (!mission) return <p className="text-sm text-muted">{t("notInApp")}</p>;
  const organization = mission.organizationName;

  const setAnswer = (questionId: string, value: string): void =>
    setEdits((current) => ({ ...current, answers: { ...current.answers, [questionId]: value } }));

  const send = (): void => {
    if (!edits.firstName.trim()) return setError(t("missingFirstName"));
    setError(null);
    startSending(async () => {
      const { data } = await createSupabaseBrowserClient().auth.getClaims();
      if (!data?.claims?.sub) return setState("needs-sign-in");

      const result = await submitApplicationAction({
        missionId: mission.sourceId,
        firstName: edits.firstName,
        city: edits.city,
        phone: "",
        motivation: edits.motivation,
        answers: draft.answers.map((entry) => ({ questionId: entry.questionId, answer: edits.answers[entry.questionId] ?? "" })),
      });
      if (result.ok) {
        clearDraftEdits(mission.sourceId);
        return setState("sent");
      }
      if (result.error === "AUTH_REQUIRED") return setState("needs-sign-in");
      if (result.error === "CONFLICT") return setState("conflict");
      setError(t("error"));
    });
  };

  if (state === "sent" || state === "conflict") {
    return (
      <section className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-card p-5 sm:p-6">
        <p className="flex items-center gap-2 display-title text-xl leading-tight text-ink">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 text-leaf">
            <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {state === "sent" ? t("sentTitle") : t("conflict")}
        </p>
        {state === "sent" && <p className="text-text">{t("done", { organization })}</p>}
        <Link href="/me" className="font-semibold text-ink underline decoration-sun decoration-2 underline-offset-4">
          {t("seeApplications")}
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby={`draft-${mission.sourceId}`} className="overflow-hidden rounded-2xl border border-line bg-card">
      <header className="flex flex-col gap-1 bg-sun-soft px-5 py-4 sm:px-6">
        <h3 id={`draft-${mission.sourceId}`} className="display-title text-xl leading-tight text-ink">
          {t("draftTitle")}
        </h3>
        <p className="text-sm text-text">
          {mission.title}, {organization}
        </p>
      </header>

      <form
        className="flex flex-col gap-4 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <p className="text-sm text-muted">{t("draftLede")}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`draft-first-name-${mission.sourceId}`} className={FIELD_LABEL}>
              {t("firstName")}
            </label>
            <input
              id={`draft-first-name-${mission.sourceId}`}
              value={edits.firstName}
              maxLength={80}
              autoComplete="given-name"
              onChange={(event) => setEdits((current) => ({ ...current, firstName: event.target.value }))}
              className={TEXT_INPUT}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`draft-city-${mission.sourceId}`} className={FIELD_LABEL}>
              {t("city")}
            </label>
            <input
              id={`draft-city-${mission.sourceId}`}
              value={edits.city}
              maxLength={120}
              autoComplete="address-level2"
              onChange={(event) => setEdits((current) => ({ ...current, city: event.target.value }))}
              className={TEXT_INPUT}
            />
          </div>
        </div>

        {draft.answers.map((entry) => {
          const value = edits.answers[entry.questionId] ?? "";
          const missing = !value.trim();
          const inputId = `draft-answer-${mission.sourceId}-${entry.questionId}`;
          return (
            <div key={entry.questionId} className="flex flex-col gap-1.5">
              {entry.kind === "yes_no" ? (
                <fieldset className="flex flex-col gap-1.5">
                  <legend className={`${FIELD_LABEL} flex flex-wrap items-baseline gap-2`}>
                    {entry.question}
                    {missing && <span className="text-xs font-normal text-muted">{t("toComplete")}</span>}
                  </legend>
                  <div className="flex gap-2">
                    {[t("yes"), t("no")].map((option) => (
                      <label
                        key={option}
                        className={`cursor-pointer rounded-full border px-4 py-1.5 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sun ${
                          value === option ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
                        }`}
                      >
                        <input
                          type="radio"
                          name={inputId}
                          value={option}
                          checked={value === option}
                          onChange={() => setAnswer(entry.questionId, option)}
                          className="sr-only"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <>
                  <label htmlFor={inputId} className={`${FIELD_LABEL} flex flex-wrap items-baseline gap-2`}>
                    {entry.question}
                    {missing && <span className="text-xs font-normal text-muted">{t("toComplete")}</span>}
                  </label>
                  <textarea
                    id={inputId}
                    rows={entry.kind === "long" ? 3 : 1}
                    maxLength={1000}
                    value={value}
                    onChange={(event) => setAnswer(entry.questionId, event.target.value)}
                    className={`${TEXT_INPUT} field-sizing-content resize-none`}
                  />
                </>
              )}
            </div>
          );
        })}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`draft-motivation-${mission.sourceId}`} className={FIELD_LABEL}>
            {t("motivation")}
          </label>
          <textarea
            id={`draft-motivation-${mission.sourceId}`}
            rows={3}
            maxLength={2000}
            value={edits.motivation}
            onChange={(event) => setEdits((current) => ({ ...current, motivation: event.target.value }))}
            className={`${TEXT_INPUT} field-sizing-content resize-none`}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {state === "needs-sign-in" ? (
          <div className="flex flex-col gap-3 rounded-xl bg-paper p-4">
            <p className="text-text">{t("signInToSend", { organization })}</p>
            <SignInForm
              nextPath={`/${locale}?apply=${mission.sourceId}`}
              onBeforeSend={() => {
                stashDraftEdits(mission.sourceId, edits);
                onBeforeSignIn();
              }}
            />
          </div>
        ) : (
          <button
            type="submit"
            disabled={isSending}
            className="self-start rounded-full bg-sun px-5 py-2.5 font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSending ? t("submitting") : t("sendTo", { organization })}
          </button>
        )}
      </form>
    </section>
  );
}
