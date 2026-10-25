"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { CARD, FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_INPUT } from "@/features/ui/styles";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/action-result";

export interface EditableField<TName extends string> {
  name: TName;
  label: string;
  value: string;
  type?: "text" | "email" | "url" | "tel" | "textarea";
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  maxLength: number;
}

interface EditableCardProps<TName extends string> {
  title: string;
  hint: string;
  fields: EditableField<TName>[];
  save: (values: Record<TName, string>) => Promise<ActionResult<null>>;
  /** Shown instead of the generic error when the server rejects the input. */
  invalidMessage?: string;
}

function valuesOf<TName extends string>(fields: EditableField<TName>[]): Record<TName, string> {
  return Object.fromEntries(fields.map((field) => [field.name, field.value])) as Record<TName, string>;
}

/** Read view by default; opens straight into the form while nothing has been filled in yet. */
export function EditableCard<TName extends string>({
  title,
  hint,
  fields,
  save,
  invalidMessage,
}: EditableCardProps<TName>): React.ReactElement {
  const t = useTranslations("space.editable");
  const router = useRouter();
  const isEmpty = fields.every((field) => !field.value);
  const [isEditing, setIsEditing] = useState(isEmpty);
  const [values, setValues] = useState(() => valuesOf(fields));
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const startEditing = (): void => {
    setValues(valuesOf(fields));
    setError(null);
    setJustSaved(false);
    setIsEditing(true);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await save(values);
      if (!result.ok) {
        setError(result.error === "INVALID_INPUT" && invalidMessage ? invalidMessage : t("error"));
        return;
      }
      setIsEditing(false);
      setJustSaved(true);
      router.refresh();
    });
  };

  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="display-title text-2xl leading-tight text-ink">{title}</h2>
          <p className="text-sm text-muted">{hint}</p>
        </div>
        {!isEditing && (
          <button type="button" onClick={startEditing} className={`${SECONDARY_BUTTON} px-4 py-1.5 text-sm`}>
            {t("edit")}
          </button>
        )}
      </div>

      {justSaved && !isEditing && (
        <p role="status" className="rounded-xl bg-leaf-soft px-4 py-2 text-sm font-semibold text-ink">
          {t("saved")}
        </p>
      )}

      {isEditing ? (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const id = `field-${field.name}`;
              const hintId = field.hint ? `${id}-hint` : undefined;
              const common = {
                id,
                name: field.name,
                value: values[field.name],
                placeholder: field.placeholder,
                maxLength: field.maxLength,
                "aria-describedby": hintId,
                onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value })),
                className: TEXT_INPUT,
              };
              return (
                <div key={field.name} className={`flex flex-col gap-1.5 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                  <label htmlFor={id} className={FIELD_LABEL}>
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea {...common} rows={4} className={`${TEXT_INPUT} resize-y`} />
                  ) : (
                    <input {...common} type={field.type ?? "text"} autoComplete={field.autoComplete} />
                  )}
                  {field.hint && (
                    <p id={hintId} className="text-xs text-muted">
                      {field.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={isPending} className={PRIMARY_BUTTON}>
              {isPending ? t("saving") : t("save")}
            </button>
            {!isEmpty && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-sm text-muted underline underline-offset-4 hover:text-ink"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </form>
      ) : (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className={`flex flex-col gap-0.5 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
              <dt className="text-sm text-muted">{field.label}</dt>
              <dd className={field.value ? "whitespace-pre-line break-words text-text" : "italic text-muted"}>
                {field.type === "url" && field.value ? (
                  <a href={field.value} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-ink">
                    {field.value.replace(/^https:\/\/(www\.)?/, "")}
                  </a>
                ) : (
                  field.value || t("empty")
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
