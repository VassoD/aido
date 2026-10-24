import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";

import { resolveModel } from "@/features/matching/model";
import type { Mission } from "@/features/missions/mission";

const AI_TIMEOUT_MS = 45_000;

const prefillSchema = z.object({
  firstName: z.string().max(80).nullable(),
  city: z.string().max(120).nullable(),
  answers: z.array(z.object({ questionId: z.string(), answer: z.string().max(1000).nullable() })),
  motivation: z.string().max(800).nullable(),
});
export type ApplicationPrefill = z.infer<typeof prefillSchema>;

function missionContext(mission: Mission): string {
  const questions = mission.inApp?.questions.map((question) => `- ${question.id} (${question.kind}): ${question.label}`).join("\n");
  return `Mission: ${mission.title}\nOrganization: ${mission.organizationName}\nPlace: ${mission.location?.city ?? "remote"}\nSchedule: ${mission.scheduleText ?? "not stated"}\n\nDescription:\n${mission.description}\n\nApplication questions:\n${questions}`;
}

/** Drafts the application from what the volunteer already said in the chat, so they only review and send. */
export async function prefillApplication(mission: Mission, transcript: string, signal?: AbortSignal): Promise<ApplicationPrefill> {
  const { model, providerOptions } = resolveModel();
  const { output } = await generateText({
    model,
    providerOptions,
    system: `You pre-fill a volunteer's application from their conversation with Aido, so they don't have to retype what they already said.
- Answer each question only with what the volunteer actually said. If the conversation does not tell, answer null. Never invent availability, experience or facts.
- yes_no questions: "Oui"/"Non" (or "Yes"/"No", matching the question language) only when clearly stated, else null.
- motivation: 2 or 3 sentences in the first person, in the volunteer's language, built only from what they said (why this mission, what they bring). null if there is too little to go on.
- firstName and city only if the volunteer stated them.`,
    prompt: `${missionContext(mission)}\n\nConversation (volunteer and assistant):\n${transcript}`,
    output: Output.object({ schema: prefillSchema }),
    abortSignal: signal ? AbortSignal.any([signal, AbortSignal.timeout(AI_TIMEOUT_MS)]) : AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  return output;
}

const fitSchema = z.object({ summary: z.string().max(500) });

export interface SubmittedAnswer {
  question: string;
  answer: string;
}

/** A short, factual note for the association: how the application lines up with what the mission needs. */
export async function summarizeFit(
  mission: Mission,
  answers: SubmittedAnswer[],
  motivation: string,
  signal?: AbortSignal,
): Promise<string> {
  const { model, providerOptions } = resolveModel();
  const { output } = await generateText({
    model,
    providerOptions,
    system: `You help a volunteer coordinator triage applications quickly. In 2 sentences max, in the mission's language, say how this application matches the mission's needs (availability, constraints, motivation) and flag anything to check. Be factual and neutral, never judge the person, never infer age, origin, health or other personal traits.`,
    prompt: `${missionContext(mission)}\n\nAnswers:\n${answers.map((entry) => `- ${entry.question}: ${entry.answer}`).join("\n")}\n\nMotivation:\n${motivation || "(none)"}`,
    output: Output.object({ schema: fitSchema }),
    abortSignal: signal ? AbortSignal.any([signal, AbortSignal.timeout(AI_TIMEOUT_MS)]) : AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  return output.summary;
}
