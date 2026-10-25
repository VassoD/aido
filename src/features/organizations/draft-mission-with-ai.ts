import "server-only";

import { generateText, Output, type ModelMessage } from "ai";

import { resolveModel } from "@/features/matching/model";
import { missionDraftSchema, type MissionDraft } from "@/features/organizations/mission-draft";
import type { AppLocale } from "@/i18n/routing";

const AI_TIMEOUT_MS = 90_000;

interface DraftMissionInput {
  organizationName: string;
  organizationCity?: string;
  /** The association's own profile text, used for the "who it helps" paragraph. */
  organizationDescription?: string;
  locale: AppLocale;
  text: string;
  pdf?: { data: Uint8Array; filename: string };
}

const LANGUAGE_NAME: Record<AppLocale, string> = { fr: "French", en: "English" };

function instructions(input: DraftMissionInput): string {
  const today = new Date().toISOString().slice(0, 10);
  return `You help a small nonprofit, "${input.organizationName}"${input.organizationCity ? ` based in ${input.organizationCity}` : ""}, publish a volunteering mission on Aido.${
    input.organizationDescription ? `\nHow they describe themselves: ${input.organizationDescription}` : ""
  }
They give you a rough description and/or their existing volunteer application form (often a long PDF). Turn it into a mission volunteers will actually want to read, and a tiny application form that replaces the PDF.

Mission:
- Write in ${LANGUAGE_NAME[input.locale]} unless the source is clearly in another language, then use the source language.
- title: what the volunteer does, starting with a verb, max 80 characters. No organization name, no jargon.
- description: plain text, three short paragraphs: what you will do; who it helps and why it matters; practical details (where, when, support or training provided). Warm and concrete. Max 900 characters. No markdown, no emoji.
- Only state facts present in the source. If something is unknown (dates, number of places, schedule, city), use null rather than guessing. commitment "unknown" if the time asked is unclear.
- Dates in YYYY-MM-DD. Today is ${today}.
- skills: up to 6 short keywords, only if the mission needs specific skills.

Application questions (this replaces their form):
- Keep only what the association genuinely needs to decide or prepare, 1 to 4 questions, short and friendly.
- Never ask for name, email, phone, address, date of birth, ID numbers, documents, CV or photos: Aido already shares contact details, and the association can ask for the rest after accepting someone.
- Prefer "yes_no" for eligibility checks (e.g. "Are you available on Saturday mornings?"), "short" for one-line answers, "long" only for motivation or experience.
- ids: q1, q2, q3, q4.`;
}

export async function draftMissionWithAi(input: DraftMissionInput, signal?: AbortSignal): Promise<MissionDraft> {
  const { model, providerOptions } = resolveModel();

  const content: Extract<ModelMessage, { role: "user" }>["content"] = [
    { type: "text", text: input.text.trim() || "(No description given; rely on the attached form.)" },
  ];
  if (input.pdf) {
    content.push({ type: "file", data: input.pdf.data, mediaType: "application/pdf", filename: input.pdf.filename });
  }

  const { output } = await generateText({
    model,
    providerOptions,
    system: instructions(input),
    messages: [{ role: "user", content }],
    output: Output.object({ schema: missionDraftSchema }),
    abortSignal: signal ? AbortSignal.any([signal, AbortSignal.timeout(AI_TIMEOUT_MS)]) : AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  return output;
}
