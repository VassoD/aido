"use client";

import { useTranslations } from "next-intl";

import { ApplicationDraftCard } from "@/features/applications/components/ApplicationDraftCard";
import { MissionTicket } from "@/features/chat/components/MissionTicket";
import { RichText } from "@/features/chat/components/RichText";
import { SearchStatus, WebSearchStatus } from "@/features/chat/components/SearchStatus";
import type { SavedMissionsApi } from "@/features/chat/hooks/use-saved-missions";
import type { MatchingAgentUIMessage, RecommendedMission } from "@/features/matching/matching-agent";
import type { Mission } from "@/features/missions/mission";

const TICKET_STAGGER_MS = 70;

interface ChatMessageProps {
  message: MatchingAgentUIMessage;
  savedMissions: SavedMissionsApi;
  onApply: (mission: Mission) => void;
  onBeforeSignIn: () => void;
}

interface TicketListProps {
  items: RecommendedMission[];
  savedMissions: SavedMissionsApi;
  onApply: (mission: Mission) => void;
}

function TicketList({ items, savedMissions, onApply }: TicketListProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      {items.map(({ mission, reason, firstStep }, index) => (
        <MissionTicket
          key={mission.id}
          mission={mission}
          reason={reason}
          firstStep={firstStep}
          rank={index + 1}
          isSaved={savedMissions.isSaved(mission.id)}
          onToggleSave={savedMissions.toggle}
          onApply={onApply}
          enterDelayMs={index * TICKET_STAGGER_MS}
        />
      ))}
    </div>
  );
}

function webSearchQuery(output: unknown): string | undefined {
  const query = (output as { action?: { query?: unknown } } | undefined)?.action?.query;
  return typeof query === "string" ? query : undefined;
}

export function ChatMessage({ message, savedMissions, onApply, onBeforeSignIn }: ChatMessageProps): React.ReactElement {
  const t = useTranslations("search");

  if (message.role === "user") {
    const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-3xl rounded-br-md bg-ink px-4 py-2.5 whitespace-pre-line text-paper">{text}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {message.parts.map((part, index) => {
        const key = `${message.id}-${index}`;
        switch (part.type) {
          case "text":
            return part.text.trim() ? (
              <div key={key} className="max-w-[68ch]">
                <RichText text={part.text} />
              </div>
            ) : null;
          case "tool-searchMissions":
            return (
              <SearchStatus
                key={key}
                state={part.state}
                input={part.input}
                output={part.state === "output-available" ? part.output : undefined}
              />
            );
          case "tool-recommendMissions":
            if (part.state !== "output-available") return null;
            return <TicketList key={key} items={part.output.recommendations} savedMissions={savedMissions} onApply={onApply} />;
          case "tool-draftApplication":
            if (part.state !== "output-available") return null;
            return <ApplicationDraftCard key={key} draft={part.output} onBeforeSignIn={onBeforeSignIn} />;
          case "tool-web_search":
            return (
              <WebSearchStatus
                key={key}
                state={part.state}
                query={part.state === "output-available" ? webSearchQuery(part.output) : undefined}
              />
            );
          case "tool-showWebMissions":
            if (part.state !== "output-available" || part.output.webMissions.length === 0) return null;
            return (
              <section key={key} className="flex flex-col gap-3">
                <h2 className="display-title text-xl leading-tight text-ink">{t("webHeading")}</h2>
                <TicketList items={part.output.webMissions} savedMissions={savedMissions} onApply={onApply} />
              </section>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
