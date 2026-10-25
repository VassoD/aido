"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { updateUnderstandingAction } from "@/features/volunteers/actions";
import { MAX_TAG_LENGTH, MAX_TAGS, type Understood } from "@/features/volunteers/profile-tags";
import { CARD, PRIMARY_BUTTON, TEXT_INPUT } from "@/features/ui/styles";
import { Link } from "@/i18n/navigation";

type FreeTextGroup = "interests" | "skills";

interface TagProps {
  label: string;
  removeLabel: string;
  disabled: boolean;
  tone: "sun" | "leaf" | "line";
  onRemove: () => void;
}

const TONE = {
  sun: "border-sun bg-sun-soft",
  leaf: "border-leaf/30 bg-leaf-soft",
  line: "border-line bg-card",
} as const;

function Tag({ label, removeLabel, disabled, tone, onRemove }: TagProps): React.ReactElement {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={removeLabel}
        className={`group inline-flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 text-sm text-ink transition-colors hover:border-ink disabled:opacity-60 ${TONE[tone]}`}
      >
        {label}
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 text-muted group-hover:text-ink">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}

function AddTagForm({ placeholder, disabled, onAdd }: { placeholder: string; disabled: boolean; onAdd: (tag: string) => void }): React.ReactElement {
  const t = useTranslations("understood");
  const inputId = useId();
  const [draft, setDraft] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const tag = draft.replace(/\s+/g, " ").trim();
        if (!tag) return;
        onAdd(tag);
        setDraft("");
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {placeholder}
      </label>
      <input
        id={inputId}
        value={draft}
        maxLength={MAX_TAG_LENGTH}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className={`${TEXT_INPUT} py-1.5 text-sm`}
      />
      <button type="submit" disabled={disabled || !draft.trim()} className={`${PRIMARY_BUTTON} px-4 py-1.5 text-sm`}>
        {t("add")}
      </button>
    </form>
  );
}

/** What the matching chat learned about the volunteer, kept on their profile and fully editable. */
export function UnderstoodCard({ initial }: { initial: Understood }): React.ReactElement {
  const t = useTranslations("understood");
  const tCauses = useTranslations("causes");
  const [tags, setTags] = useState<Understood>(initial);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEmpty = tags.causes.length + tags.interests.length + tags.skills.length === 0;

  const save = (next: Understood): void => {
    const previous = tags;
    setTags(next);
    setError(false);
    startTransition(async () => {
      const result = await updateUnderstandingAction(next);
      if (!result.ok) {
        setTags(previous);
        setError(true);
      }
    });
  };

  const addTo = (group: FreeTextGroup, tag: string): void => {
    if (tags[group].some((existing) => existing.toLocaleLowerCase() === tag.toLocaleLowerCase())) return;
    save({ ...tags, [group]: [tag, ...tags[group]].slice(0, MAX_TAGS) });
  };

  const freeTextGroups: { group: FreeTextGroup; tone: "leaf" | "line" }[] = [
    { group: "skills", tone: "leaf" },
    { group: "interests", tone: "line" },
  ];

  return (
    <section aria-labelledby="understood-title" className={`${CARD} flex flex-col gap-5`}>
      <div className="flex flex-col gap-1">
        <p className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-leaf">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
            <path
              d="M8 1.5l1.6 4.1 4.4.3-3.4 2.8 1.1 4.3L8 10.6 4.3 13l1.1-4.3L2 5.9l4.4-.3z"
              fill="currentColor"
            />
          </svg>
          {t("eyebrow")}
        </p>
        <h2 id="understood-title" className="display-title text-2xl leading-tight text-ink">
          {t("title")}
        </h2>
        <p className="text-sm text-muted">{t("hint")}</p>
      </div>

      {isEmpty && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-mist px-4 py-3">
          <p className="flex-1 text-sm text-text">{t("empty")}</p>
          <Link href="/" className="text-sm font-bold text-ink underline underline-offset-4">
            {t("chatCta")}
          </Link>
        </div>
      )}

      {tags.causes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-ink">{t("causes")}</h3>
          <ul className="flex flex-wrap gap-2">
            {tags.causes.map((cause) => (
              <Tag
                key={cause}
                label={tCauses(cause)}
                tone="sun"
                disabled={isPending}
                removeLabel={t("remove", { label: tCauses(cause) })}
                onRemove={() => save({ ...tags, causes: tags.causes.filter((existing) => existing !== cause) })}
              />
            ))}
          </ul>
        </div>
      )}

      {freeTextGroups.map(({ group, tone }) => (
        <div key={group} className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-ink">{t(group)}</h3>
          {tags[group].length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {tags[group].map((tag) => (
                <Tag
                  key={tag}
                  label={tag}
                  tone={tone}
                  disabled={isPending}
                  removeLabel={t("remove", { label: tag })}
                  onRemove={() => save({ ...tags, [group]: tags[group].filter((existing) => existing !== tag) })}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-muted">{t("nothingYet")}</p>
          )}
          {tags[group].length < MAX_TAGS && (
            <AddTagForm
              placeholder={t(group === "skills" ? "addSkill" : "addInterest")}
              disabled={isPending}
              onAdd={(tag) => addTo(group, tag)}
            />
          )}
        </div>
      ))}

      <p className="text-xs text-muted">{t("visibility")}</p>

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t("error")}
        </p>
      )}
    </section>
  );
}
