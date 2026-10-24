"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { sendApplicationMessageAction } from "@/features/applications/actions";
import type { ThreadMessage } from "@/features/applications/queries";
import { PRIMARY_BUTTON, TEXT_INPUT } from "@/features/ui/styles";
import { useRouter } from "@/i18n/navigation";

interface ApplicationThreadProps {
  applicationId: string;
  messages: ThreadMessage[];
  replyLabel: string;
  otherPartyName: string;
}

export function ApplicationThread({ applicationId, messages, replyLabel, otherPartyName }: ApplicationThreadProps): React.ReactElement {
  const t = useTranslations("applicants");
  const locale = useLocale();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timeFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-ink">{t("thread")}</h4>
      {messages.length === 0 ? (
        <p className="text-sm text-muted">{t("noMessages")}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {messages.map((message) => (
            <li key={message.id} className={`flex flex-col ${message.fromMe ? "items-end" : "items-start"}`}>
              <p
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 whitespace-pre-line ${
                  message.fromMe ? "rounded-br-md bg-ink text-paper" : "rounded-bl-md bg-paper text-text"
                }`}
              >
                {message.body}
              </p>
              <span className="mt-0.5 text-xs text-muted">
                {message.fromMe ? t("you") : otherPartyName}, {timeFormat.format(new Date(message.createdAt))}
              </span>
            </li>
          ))}
        </ol>
      )}
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!body.trim()) return;
          setFailed(false);
          startTransition(async () => {
            const result = await sendApplicationMessageAction(applicationId, body);
            if (!result.ok) return setFailed(true);
            setBody("");
            router.refresh();
          });
        }}
      >
        <label htmlFor={`reply-${applicationId}`} className="sr-only">
          {replyLabel}
        </label>
        <input
          id={`reply-${applicationId}`}
          value={body}
          maxLength={2000}
          placeholder={replyLabel}
          onChange={(event) => setBody(event.target.value)}
          className={TEXT_INPUT}
        />
        <button type="submit" disabled={isPending || !body.trim()} className={`${PRIMARY_BUTTON} shrink-0`}>
          {t("send")}
        </button>
      </form>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t("sendFailed")}
        </p>
      )}
    </div>
  );
}
