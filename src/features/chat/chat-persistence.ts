import type { MatchingAgentUIMessage } from "@/features/matching/matching-agent";

const STORAGE_KEY = "aido.pending-chat.v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredChat {
  savedAt: number;
  messages: MatchingAgentUIMessage[];
}

/** Keeps the conversation across the magic-link round trip, which usually opens a new tab. */
export function stashChat(messages: MatchingAgentUIMessage[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), messages } satisfies StoredChat));
  } catch {
    // Storage unavailable: the volunteer comes back to an empty chat, the application form still opens.
  }
}

export function takeStashedChat(): MatchingAgentUIMessage[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredChat;
    return Date.now() - stored.savedAt < MAX_AGE_MS && Array.isArray(stored.messages) ? stored.messages : null;
  } catch {
    return null;
  }
}

export function transcriptOf(messages: MatchingAgentUIMessage[]): string {
  return messages
    .map((message) => {
      const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join(" ").trim();
      if (!text) return "";
      return `${message.role === "user" ? "Volunteer" : "Aido"}: ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

const DRAFT_EDITS_PREFIX = "aido.draft-edits.v1.";

export interface DraftEdits {
  firstName: string;
  city: string;
  motivation: string;
  answers: Record<string, string>;
}

/** Card edits made before signing in, restored when the volunteer comes back from the email link. */
export function stashDraftEdits(missionId: string, edits: DraftEdits): void {
  try {
    window.localStorage.setItem(`${DRAFT_EDITS_PREFIX}${missionId}`, JSON.stringify(edits));
  } catch {
    // Storage unavailable: the card falls back to the AI draft.
  }
}

export function readDraftEdits(missionId: string): DraftEdits | null {
  try {
    const raw = window.localStorage.getItem(`${DRAFT_EDITS_PREFIX}${missionId}`);
    return raw ? (JSON.parse(raw) as DraftEdits) : null;
  } catch {
    return null;
  }
}

export function clearDraftEdits(missionId: string): void {
  try {
    window.localStorage.removeItem(`${DRAFT_EDITS_PREFIX}${missionId}`);
  } catch {
    // Nothing to clear.
  }
}

/** True when a restored conversation already holds a draft card for this mission. */
export function hasDraftFor(messages: MatchingAgentUIMessage[], missionSourceId: string): boolean {
  return messages.some((message) =>
    message.parts.some(
      (part) =>
        part.type === "tool-draftApplication" &&
        part.state === "output-available" &&
        part.output.mission?.sourceId === missionSourceId,
    ),
  );
}
