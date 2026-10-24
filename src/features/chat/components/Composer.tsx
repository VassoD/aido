"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

const MAX_MESSAGE_LENGTH = 1_500;

interface ComposerProps {
  isBusy: boolean;
  variant: "hero" | "follow-up";
  onSend: (text: string) => void;
  onStop: () => void;
}

export function Composer({ isBusy, variant, onSend, onStop }: ComposerProps): React.ReactElement {
  const t = useTranslations("composer");
  const [value, setValue] = useState("");
  const trimmed = value.trim();

  const submit = (): void => {
    if (!trimmed || isBusy) return;
    onSend(trimmed);
    setValue("");
  };

  const isHero = variant === "hero";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={`flex items-end gap-2 rounded-3xl border-2 bg-surface p-2 transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_4px_var(--marigold-soft)] ${
        isHero ? "border-ink" : "border-line"
      }`}
    >
      <label htmlFor="aido-message" className="sr-only">
        {t("label")}
      </label>
      <textarea
        id="aido-message"
        data-focus="custom"
        value={value}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={isHero ? 3 : 1}
        autoFocus={isHero}
        placeholder={isHero ? t("placeholder") : t("placeholderFollowUp")}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        className={`field-sizing-content max-h-48 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-text placeholder:text-muted focus:outline-none ${
          isHero ? "min-h-24 text-lg" : ""
        }`}
      />
      {isBusy ? (
        <button
          type="button"
          onClick={onStop}
          className="shrink-0 rounded-full border border-line px-5 py-2.5 font-semibold text-ink hover:border-ink"
        >
          {t("stop")}
        </button>
      ) : (
        <button
          type="submit"
          disabled={!trimmed}
          className="shrink-0 rounded-full bg-ink px-5 py-2.5 font-semibold text-paper transition-opacity disabled:opacity-40"
        >
          {t("send")}
        </button>
      )}
    </form>
  );
}
