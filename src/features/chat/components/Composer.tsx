"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/features/ui/styles";

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
      className={`flex items-end gap-2 rounded-[1.6rem] border-2 bg-card p-2 shadow-[0_18px_40px_-24px_rgb(18_38_29/0.55)] transition-[border-color,box-shadow] focus-within:border-ink focus-within:ring-4 focus-within:ring-ink/10 ${
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
          className={`${SECONDARY_BUTTON} shrink-0`}
        >
          {t("stop")}
        </button>
      ) : (
        <button
          type="submit"
          disabled={!trimmed}
          className={`${PRIMARY_BUTTON} shrink-0`}
        >
          {t("send")}
        </button>
      )}
    </form>
  );
}
