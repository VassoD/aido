"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getApplyableMissionAction } from "@/features/applications/actions";
import { ApplyDialog } from "@/features/applications/components/ApplyDialog";
import { hasDraftFor, stashChat, takeStashedChat, transcriptOf } from "@/features/chat/chat-persistence";
import { AppHeader } from "@/features/chat/components/AppHeader";
import { ChatMessage } from "@/features/chat/components/ChatMessage";
import { Composer } from "@/features/chat/components/Composer";
import { ProfileStrip } from "@/features/chat/components/ProfileStrip";
import { SavedPanel } from "@/features/chat/components/SavedPanel";
import { chatErrorCode } from "@/features/chat/error-code";
import { useSavedMissions } from "@/features/chat/hooks/use-saved-missions";
import type { MatchingAgentUIMessage } from "@/features/matching/matching-agent";
import { DEFAULT_COUNTRY } from "@/features/missions/country-options";
import type { Mission } from "@/features/missions/mission";
import type { MissionSearchQuery } from "@/features/missions/search-query";

const EXAMPLE_KEYS = ["one", "two", "three"] as const;

function latestSearchQuery(messages: MatchingAgentUIMessage[]): MissionSearchQuery | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
    const parts = messages[messageIndex].parts;
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex--) {
      const part = parts[partIndex];
      if (part.type === "tool-searchMissions" && part.state === "output-available") return part.input;
    }
  }
  return null;
}

export function ChatExperience(): React.ReactElement {
  const locale = useLocale();
  const t = useTranslations();
  const savedMissions = useSavedMissions();
  const [savedOpen, setSavedOpen] = useState(false);
  const [applyingTo, setApplyingTo] = useState<Mission | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport<MatchingAgentUIMessage>({ api: "/api/chat", body: { locale, country: DEFAULT_COUNTRY } }),
    [locale],
  );
  const { messages, sendMessage, setMessages, status, stop, error, regenerate, clearError } =
    useChat<MatchingAgentUIMessage>({ transport });

  const isBusy = status === "submitted" || status === "streaming";
  const profile = useMemo(() => latestSearchQuery(messages), [messages]);
  const hasConversation = messages.length > 0;

  const send = useCallback((text: string) => void sendMessage({ text }), [sendMessage]);
  const requestApplication = useCallback(
    (mission: Mission) => send(t("apply.chatRequest", { title: mission.title })),
    [send, t],
  );
  const restart = useCallback(() => {
    void stop();
    clearError();
    setMessages([]);
  }, [stop, clearError, setMessages]);

  // Coming back from the sign-in email: restore the conversation and reopen the application.
  useEffect(() => {
    const url = new URL(window.location.href);
    const missionId = url.searchParams.get("apply");
    if (!missionId) return;
    url.searchParams.delete("apply");
    window.history.replaceState(null, "", url);

    const stashed = takeStashedChat();
    if (stashed) setMessages(stashed);
    // The draft card in the restored conversation picks up where they left off; otherwise open the form.
    if (stashed && hasDraftFor(stashed, missionId)) return;
    void getApplyableMissionAction(missionId).then((result) => {
      if (result.ok) setApplyingTo(result.data);
    });
  }, [setMessages]);

  useEffect(() => {
    if (hasConversation) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, status, hasConversation]);

  return (
    <>
      <AppHeader savedCount={savedMissions.saved.length} onOpenSaved={() => setSavedOpen(true)} onRestart={restart} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
        {!hasConversation ? (
          <section className="flex flex-1 flex-col justify-center gap-8 py-10 sm:py-16">
            <div className="flex flex-col gap-5">
              <h1 className="font-display text-[2.5rem] leading-[1.02] font-bold tracking-tight text-balance text-ink sm:text-[4rem]">
                {t("intro.headline")}
              </h1>
              <p className="max-w-[60ch] text-lg text-muted">{t("intro.lede")}</p>
            </div>
            <Composer variant="hero" isBusy={isBusy} onSend={send} onStop={() => void stop()} />
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">{t("intro.examplesLabel")}</p>
              <ul className="flex flex-col gap-1">
                {EXAMPLE_KEYS.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => send(t(`intro.examples.${key}`))}
                      className="text-left text-ink underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-marigold"
                    >
                      {t(`intro.examples.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : (
          <div className="flex flex-1 flex-col gap-6 pt-4 pb-6">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                savedMissions={savedMissions}
                onApply={requestApplication}
                onBeforeSignIn={() => stashChat(messages)}
              />
            ))}
            {status === "submitted" && (
              <span className="size-2 animate-pulse rounded-full bg-marigold motion-reduce:animate-none" aria-hidden="true" />
            )}
            {error && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-danger/40 px-4 py-3">
                <p className="text-danger">{t(`errors.${chatErrorCode(error)}`)}</p>
                <button type="button" onClick={() => void regenerate()} className="font-semibold text-ink underline">
                  {t("errors.retry")}
                </button>
                <button type="button" onClick={restart} className="font-semibold text-ink underline">
                  {t("errors.restart")}
                </button>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </main>

      {hasConversation && (
        <div className="sticky bottom-0 border-t border-line bg-paper/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-3 sm:px-6">
            {profile && (
              <ProfileStrip
                query={profile}
                disabled={isBusy}
                onRemove={(label) => send(t("profile.removeMessage", { label }))}
              />
            )}
            <Composer variant="follow-up" isBusy={isBusy} onSend={send} onStop={() => void stop()} />
          </div>
        </div>
      )}

      <footer className="mx-auto w-full max-w-3xl px-4 py-6 text-xs text-muted sm:px-6">
        <p>{t("footer.attribution")}</p>
        <p className="mt-1">{t("footer.ai")}</p>
      </footer>

      <SavedPanel open={savedOpen} onClose={() => setSavedOpen(false)} savedMissions={savedMissions} />

      {applyingTo && (
        <ApplyDialog
          key={applyingTo.id}
          mission={applyingTo}
          transcript={transcriptOf(messages)}
          onClose={() => setApplyingTo(null)}
          onBeforeSignIn={() => stashChat(messages)}
        />
      )}
    </>
  );
}
