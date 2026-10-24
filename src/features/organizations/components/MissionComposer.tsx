"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { CAUSES, COMMITMENTS } from "@/features/missions/mission";
import { draftMissionAction, publishMissionAction } from "@/features/organizations/actions";
import {
  MAX_QUESTIONS,
  type ApplicationQuestion,
  type MissionDraft,
} from "@/features/organizations/mission-draft";
import { CARD, FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_INPUT } from "@/features/ui/styles";
import { useRouter } from "@/i18n/navigation";

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MIN_DESCRIPTION_CHARS = 20;
const LOCATION_MODES = ["onsite", "remote", "hybrid"] as const;
const QUESTION_KINDS = ["short", "long", "yes_no"] as const;

function nextQuestionId(questions: ApplicationQuestion[]): string {
  const used = new Set(questions.map((question) => question.id));
  for (let index = 1; index <= MAX_QUESTIONS + questions.length; index++) {
    if (!used.has(`q${index}`)) return `q${index}`;
  }
  return `q${Date.now()}`;
}

export function MissionComposer(): React.ReactElement {
  const t = useTranslations("missionComposer");
  const tCauses = useTranslations("causes");
  const tCommitment = useTranslations("ticket.commitment");
  const locale = useLocale();
  const router = useRouter();

  const [text, setText] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [draft, setDraft] = useState<MissionDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDrafting, startDrafting] = useTransition();
  const [isPublishing, startPublishing] = useTransition();

  const generate = (): void => {
    setError(null);
    if (!pdf && text.trim().length < MIN_DESCRIPTION_CHARS) return setError(t("errors.tooShort"));
    if (pdf && (pdf.type !== "application/pdf" || pdf.size > MAX_PDF_BYTES)) return setError(t("errors.pdfInvalid"));

    const formData = new FormData();
    formData.set("text", text);
    formData.set("locale", locale);
    if (pdf) formData.set("pdf", pdf);
    startDrafting(async () => {
      const result = await draftMissionAction(formData);
      if (result.ok) setDraft(result.data);
      else setError(result.error === "INVALID_INPUT" ? t("errors.tooShort") : t("errors.ai"));
    });
  };

  const publish = (): void => {
    if (!draft) return;
    setError(null);
    startPublishing(async () => {
      const result = await publishMissionAction(draft);
      if (!result.ok) return setError(t("errors.publish"));
      router.push(`/asso/missions/${result.data.missionId}?published=1`);
      router.refresh();
    });
  };

  const update = <TKey extends keyof MissionDraft>(key: TKey, value: MissionDraft[TKey]): void =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const updateQuestion = (index: number, patch: Partial<ApplicationQuestion>): void =>
    setDraft((current) =>
      current
        ? { ...current, questions: current.questions.map((question, position) => (position === index ? { ...question, ...patch } : question)) }
        : current,
    );

  if (!draft) {
    return (
      <section className={`${CARD} flex flex-col gap-4`}>
        <div className="flex flex-col gap-2">
          <label htmlFor="mission-text" className={FIELD_LABEL}>
            {t("describe")}
          </label>
          <textarea
            id="mission-text"
            rows={7}
            value={text}
            maxLength={6000}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("describePlaceholder")}
            className={TEXT_INPUT}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span id="mission-pdf-label" className={FIELD_LABEL}>
            {t("pdf")}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="mission-pdf"
              className={`${SECONDARY_BUTTON} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sun`}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="mr-2 size-4">
                <path d="M10 13V3m0 0L6 7m4-4l4 4M4 13v3h12v-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("pdfChoose")}
              <input
                id="mission-pdf"
                type="file"
                accept="application/pdf"
                aria-labelledby="mission-pdf-label"
                onChange={(event) => setPdf(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
            <span className="min-w-0 truncate text-sm text-muted">{pdf ? pdf.name : t("pdfNone")}</span>
            {pdf && (
              <button
                type="button"
                onClick={() => setPdf(null)}
                className="text-sm text-muted underline underline-offset-4 hover:text-ink"
              >
                {t("pdfRemove")}
              </button>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button type="button" onClick={generate} disabled={isDrafting} className={`${PRIMARY_BUTTON} self-start`}>
          {isDrafting ? t("generating") : t("generate")}
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="display-title text-2xl leading-tight text-ink">{t("reviewTitle")}</h2>
        <p className="mt-1 text-muted">{t("reviewLede")}</p>
      </div>

      <div className={`${CARD} grid gap-4`}>
        <Field id="draft-title" label={t("fields.title")}>
          <input id="draft-title" value={draft.title} maxLength={160} onChange={(event) => update("title", event.target.value)} className={TEXT_INPUT} />
        </Field>
        <Field id="draft-description" label={t("fields.description")}>
          <textarea
            id="draft-description"
            rows={8}
            value={draft.description}
            maxLength={5000}
            onChange={(event) => update("description", event.target.value)}
            className={TEXT_INPUT}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="draft-city" label={t("fields.city")}>
            <input id="draft-city" value={draft.city ?? ""} onChange={(event) => update("city", event.target.value || null)} className={TEXT_INPUT} />
          </Field>
          <Field id="draft-mode" label={t("fields.locationMode")}>
            <select id="draft-mode" value={draft.locationMode} onChange={(event) => update("locationMode", event.target.value as MissionDraft["locationMode"])} className={TEXT_INPUT}>
              {LOCATION_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`locationModes.${mode}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="draft-commitment" label={t("fields.commitment")}>
            <select id="draft-commitment" value={draft.commitment} onChange={(event) => update("commitment", event.target.value as MissionDraft["commitment"])} className={TEXT_INPUT}>
              {COMMITMENTS.map((commitment) => (
                <option key={commitment} value={commitment}>
                  {tCommitment(commitment)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="draft-cause" label={t("fields.cause")}>
            <select id="draft-cause" value={draft.cause} onChange={(event) => update("cause", event.target.value as MissionDraft["cause"])} className={TEXT_INPUT}>
              {CAUSES.map((cause) => (
                <option key={cause} value={cause}>
                  {tCauses(cause)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="draft-schedule" label={t("fields.schedule")}>
            <input id="draft-schedule" value={draft.scheduleText ?? ""} maxLength={200} onChange={(event) => update("scheduleText", event.target.value || null)} className={TEXT_INPUT} />
          </Field>
          <Field id="draft-places" label={t("fields.places")}>
            <input
              id="draft-places"
              type="number"
              min={1}
              value={draft.places ?? ""}
              onChange={(event) => update("places", event.target.value ? Number(event.target.value) : null)}
              className={TEXT_INPUT}
            />
          </Field>
          <Field id="draft-start" label={t("fields.startDate")}>
            <input id="draft-start" type="date" value={draft.startDate ?? ""} onChange={(event) => update("startDate", event.target.value || null)} className={TEXT_INPUT} />
          </Field>
          <Field id="draft-end" label={t("fields.endDate")}>
            <input id="draft-end" type="date" value={draft.endDate ?? ""} onChange={(event) => update("endDate", event.target.value || null)} className={TEXT_INPUT} />
          </Field>
        </div>
      </div>

      <div className={`${CARD} flex flex-col gap-4`}>
        <div>
          <h3 className="display-title text-xl leading-tight text-ink">{t("questionsTitle")}</h3>
          <p className="mt-1 text-sm text-muted">{t("questionsLede")}</p>
        </div>
        <ol className="flex flex-col gap-3">
          {draft.questions.map((question, index) => (
            <li key={question.id} className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center">
              <input
                aria-label={`${t("questionsTitle")} ${index + 1}`}
                value={question.label}
                maxLength={200}
                onChange={(event) => updateQuestion(index, { label: event.target.value })}
                className={TEXT_INPUT}
              />
              <select
                aria-label={t("questionKinds.short")}
                value={question.kind}
                onChange={(event) => updateQuestion(index, { kind: event.target.value as ApplicationQuestion["kind"] })}
                className={`${TEXT_INPUT} sm:w-44`}
              >
                {QUESTION_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`questionKinds.${kind}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={draft.questions.length <= 1}
                onClick={() => update("questions", draft.questions.filter((_, position) => position !== index))}
                className="shrink-0 text-sm text-muted underline underline-offset-4 hover:text-ink disabled:opacity-40"
              >
                {t("removeQuestion")}
              </button>
            </li>
          ))}
        </ol>
        {draft.questions.length < MAX_QUESTIONS && (
          <button
            type="button"
            onClick={() => update("questions", [...draft.questions, { id: nextQuestionId(draft.questions), label: "", kind: "short" }])}
            className={`${SECONDARY_BUTTON} self-start`}
          >
            {t("addQuestion")}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={publish} disabled={isPublishing} className={PRIMARY_BUTTON}>
          {isPublishing ? t("publishing") : t("publish")}
        </button>
        <button type="button" onClick={() => setDraft(null)} disabled={isPublishing} className={SECONDARY_BUTTON}>
          {t("startOver")}
        </button>
      </div>
    </section>
  );
}

interface FieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

function Field({ id, label, children }: FieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      {children}
    </div>
  );
}
