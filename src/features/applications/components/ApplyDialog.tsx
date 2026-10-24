"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { prefillApplicationAction, submitApplicationAction } from "@/features/applications/actions";
import { SignInForm } from "@/features/auth/SignInForm";
import type { Mission } from "@/features/missions/mission";
import { FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_INPUT } from "@/features/ui/styles";
import { Link } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ApplyDialogProps {
  mission: Mission;
  transcript: string;
  onClose: () => void;
  /** Called before the sign-in email is sent, so the conversation survives the round trip. */
  onBeforeSignIn: () => void;
}

type Phase = "checking" | "sign-in" | "prefilling" | "form" | "done";

export function ApplyDialog({ mission, transcript, onClose, onBeforeSignIn }: ApplyDialogProps): React.ReactElement {
  const t = useTranslations("apply");
  const locale = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const questions = mission.inApp?.questions ?? [];

  const [phase, setPhase] = useState<Phase>("checking");
  const [wasPrefilled, setWasPrefilled] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [motivation, setMotivation] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const prepare = async (): Promise<void> => {
      const { data } = await createSupabaseBrowserClient().auth.getClaims();
      if (cancelled) return;
      if (!data?.claims?.sub) return setPhase("sign-in");

      setPhase("prefilling");
      const result = await prefillApplicationAction(mission.sourceId, transcript);
      if (cancelled) return;
      if (result.ok) {
        const prefill = result.data;
        setFirstName(prefill.firstName ?? "");
        setCity(prefill.city ?? "");
        setMotivation(prefill.motivation ?? "");
        setAnswers(
          Object.fromEntries(prefill.answers.filter((entry) => entry.answer).map((entry) => [entry.questionId, entry.answer ?? ""])),
        );
        setWasPrefilled(prefill.answers.some((entry) => entry.answer) || Boolean(prefill.motivation));
      }
      setPhase("form");
    };
    void prepare();
    return () => {
      cancelled = true;
    };
  }, [mission.sourceId, transcript]);

  const submit = (): void => {
    if (!firstName.trim()) return setError(t("missingFirstName"));
    setError(null);
    startSubmitting(async () => {
      const result = await submitApplicationAction({
        missionId: mission.sourceId,
        firstName,
        city,
        phone,
        motivation,
        answers: questions.map((question) => ({ questionId: question.id, answer: answers[question.id] ?? "" })),
      });
      if (result.ok) return setPhase("done");
      if (result.error === "AUTH_REQUIRED") return setPhase("sign-in");
      setError(result.error === "CONFLICT" ? t("conflict") : t("error"));
    });
  };

  const setAnswer = (questionId: string, value: string): void => setAnswers((current) => ({ ...current, [questionId]: value }));

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="apply-title"
      className="m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-xl rounded-3xl bg-paper p-0 text-text backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-5 p-5 sm:p-7">
        <div>
          <p className="text-sm text-muted">{mission.organizationName}</p>
          <h2 id="apply-title" className="display-title text-2xl leading-tight text-ink">
            {mission.title}
          </h2>
        </div>

        {(phase === "checking" || phase === "prefilling") && (
          <p role="status" className="flex items-center gap-2 text-muted">
            <span className="size-2 animate-pulse rounded-full bg-sun motion-reduce:animate-none" aria-hidden="true" />
            {t("prefilling")}
          </p>
        )}

        {phase === "sign-in" && (
          <div className="flex flex-col gap-3">
            <p className="text-text">{t("signInFirst")}</p>
            <SignInForm nextPath={`/${locale}?apply=${mission.sourceId}`} onBeforeSend={onBeforeSignIn} />
          </div>
        )}

        {phase === "form" && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            {wasPrefilled && <p className="rounded-xl bg-sun-soft px-3.5 py-2.5 text-sm text-text">{t("prefilled")}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput id="apply-first-name" label={t("firstName")} value={firstName} onChange={setFirstName} autoComplete="given-name" required />
              <LabeledInput id="apply-city" label={t("city")} value={city} onChange={setCity} autoComplete="address-level2" />
            </div>
            <LabeledInput id="apply-phone" label={t("phone")} value={phone} onChange={setPhone} autoComplete="tel" type="tel" />

            {questions.map((question) => (
              <div key={question.id} className="flex flex-col gap-1.5">
                {question.kind === "yes_no" ? (
                  <fieldset className="flex flex-col gap-1.5">
                    <legend className={FIELD_LABEL}>{question.label}</legend>
                    <div className="flex gap-2">
                      {[t("yes"), t("no")].map((option) => (
                        <label
                          key={option}
                          className={`cursor-pointer rounded-full border px-4 py-1.5 ${
                            answers[question.id] === option ? "border-ink bg-ink text-paper" : "border-line text-ink"
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={() => setAnswer(question.id, option)}
                            className="sr-only"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <>
                    <label htmlFor={`answer-${question.id}`} className={FIELD_LABEL}>
                      {question.label}
                    </label>
                    {question.kind === "long" ? (
                      <textarea
                        id={`answer-${question.id}`}
                        rows={3}
                        maxLength={1000}
                        value={answers[question.id] ?? ""}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                        className={TEXT_INPUT}
                      />
                    ) : (
                      <input
                        id={`answer-${question.id}`}
                        maxLength={1000}
                        value={answers[question.id] ?? ""}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                        className={TEXT_INPUT}
                      />
                    )}
                  </>
                )}
              </div>
            ))}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="apply-motivation" className={FIELD_LABEL}>
                {t("motivation")}
              </label>
              <textarea
                id="apply-motivation"
                rows={4}
                maxLength={2000}
                value={motivation}
                onChange={(event) => setMotivation(event.target.value)}
                className={TEXT_INPUT}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON}>
                {isSubmitting ? t("submitting") : t("submit")}
              </button>
              <button type="button" onClick={() => dialogRef.current?.close()} className={SECONDARY_BUTTON}>
                {t("cancel")}
              </button>
            </div>
          </form>
        )}

        {phase === "done" && (
          <div className="flex flex-col gap-4">
            <p role="status" className="rounded-2xl bg-leaf-soft px-4 py-3 text-text">
              {t("done", { organization: mission.organizationName })}
            </p>
            <Link href="/me" className={`${PRIMARY_BUTTON} self-start`}>
              {t("seeApplications")}
            </Link>
          </div>
        )}

        {phase !== "form" && phase !== "done" && (
          <button type="button" onClick={() => dialogRef.current?.close()} className={`${SECONDARY_BUTTON} self-start`}>
            {t("cancel")}
          </button>
        )}
      </div>
    </dialog>
  );
}

interface LabeledInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  type?: string;
  required?: boolean;
}

function LabeledInput({ id, label, value, onChange, autoComplete, type = "text", required }: LabeledInputProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        maxLength={120}
        onChange={(event) => onChange(event.target.value)}
        className={TEXT_INPUT}
      />
    </div>
  );
}
