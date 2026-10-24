"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { sendMagicLinkAction } from "@/features/auth/actions";
import { FIELD_LABEL, PRIMARY_BUTTON, TEXT_INPUT } from "@/features/ui/styles";

interface SignInFormProps {
  /** Locale-prefixed path to land on after clicking the email link. */
  nextPath: string;
  /** Runs right before the email is sent, e.g. to stash unsaved state the link will come back to. */
  onBeforeSend?: () => void;
}

export function SignInForm({ nextPath, onBeforeSend }: SignInFormProps): React.ReactElement {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (sentTo) {
    return (
      <p role="status" className="rounded-2xl bg-sage-soft px-4 py-3 text-text">
        {t("sent", { email: sentTo })}
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          onBeforeSend?.();
          const result = await sendMagicLinkAction({ email: email.trim(), nextPath });
          if (result.ok) setSentTo(email.trim());
          else setError(result.error === "RATE_LIMIT_EXCEEDED" ? t("rateLimited") : t("error"));
        });
      }}
    >
      <label htmlFor="sign-in-email" className={FIELD_LABEL}>
        {t("email")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="sign-in-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={TEXT_INPUT}
        />
        <button type="submit" disabled={isPending} className={`${PRIMARY_BUTTON} shrink-0`}>
          {isPending ? t("sending") : t("send")}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
