import "server-only";

import { openai } from "@ai-sdk/openai";
import { isStepCount, tool, ToolLoopAgent, type InferAgentUIMessage } from "ai";
import { z } from "zod";

import { buildInstructions } from "@/features/matching/instructions";
import { resolveModel } from "@/features/matching/model";
import type { Mission } from "@/features/missions/mission";
import { missionSearchQuerySchema } from "@/features/missions/search-query";
import { getMissionById, getProviderAttribution, searchMissions } from "@/features/missions/search-missions";
import { verifyWebMissions, webMissionInputSchema, type VerifiedWebMission } from "@/features/missions/web-missions";
import type { AppLocale } from "@/i18n/routing";
import { logger } from "@/lib/logger";

const MAX_STEPS = 8;
const MAX_RECOMMENDATIONS = 5;
const MAX_WEB_MISSIONS = 3;
const CARD_DESCRIPTION_LENGTH = 900;

export interface RecommendedMission {
  mission: Mission;
  reason: string;
  firstStep?: string;
}

export interface RecommendationsOutput {
  recommendations: RecommendedMission[];
  attribution: string;
}

export interface DraftedAnswer {
  questionId: string;
  question: string;
  kind: string;
  answer: string | null;
}

export interface ApplicationDraftOutput {
  mission: Mission | null;
  firstName: string | null;
  city: string | null;
  answers: DraftedAnswer[];
  motivation: string | null;
}

export interface WebMissionsOutput {
  webMissions: VerifiedWebMission[];
}

interface MatchingAgentOptions {
  countryCode: string;
  locale: AppLocale;
}

function trimForCard(mission: Mission): Mission {
  return { ...mission, description: mission.description.slice(0, CARD_DESCRIPTION_LENGTH) };
}

function createTools(countryCode: string) {
  // Missions posted on Aido from the latest search, so recommendations can be checked against them.
  let inAppCandidates: { id: string; title: string }[] = [];

  return {
    web_search: openai.tools.webSearch({
      searchContextSize: "low",
      userLocation: { type: "approximate", country: countryCode },
    }),

    showWebMissions: tool({
      description:
        "Show up to 3 volunteering opportunities found with web_search, on sites other than the connected sources. Each link is checked before display.",
      inputSchema: z.object({ missions: z.array(webMissionInputSchema).min(1).max(MAX_WEB_MISSIONS) }),
      execute: async ({ missions }, { abortSignal }): Promise<WebMissionsOutput> => ({
        webMissions: await verifyWebMissions(missions, countryCode, abortSignal),
      }),
      toModelOutput: ({ output }) => ({
        type: "json",
        value: {
          shown: output.webMissions.map(({ mission }) => mission.title),
          note: output.webMissions.length === 0 ? "No link could be verified; none were shown." : null,
        },
      }),
    }),

    searchMissions: tool({
      description:
        "Search real, currently open volunteering missions near a place or remote, filtered and pre-ranked for the person. Returns up to 25 candidates.",
      inputSchema: missionSearchQuerySchema,
      execute: async (query, { abortSignal }) => {
        const result = await searchMissions(query, countryCode, abortSignal);
        if (result.status === "ok") {
          inAppCandidates = result.candidates.filter((candidate) => candidate.applyInApp).map(({ id, title }) => ({ id, title }));
        }
        return result;
      },
    }),

    draftApplication: tool({
      description:
        "Prepare the person's application to a mission posted on Aido (applyInApp true). Shows a ready-to-send card: the person reviews it and sends it themselves. Never claim it was sent.",
      inputSchema: z.object({
        missionId: z.string().describe("The mission id from searchMissions, starting with 'aido:'."),
        firstName: z.string().max(80).nullable().describe("Only if the person said it."),
        city: z.string().max(120).nullable().describe("Only if the person said it."),
        answers: z
          .array(
            z.object({
              questionId: z.string(),
              answer: z.string().max(1000).nullable().describe("From what the person said; null if unknown. Never invent."),
            }),
          )
          .max(10),
        motivation: z
          .string()
          .max(800)
          .nullable()
          .describe("2 or 3 sentences in the first person, in the person's language, built only from what they said."),
      }),
      execute: async ({ missionId, firstName, city, answers, motivation }, { abortSignal }): Promise<ApplicationDraftOutput> => {
        const mission = await getMissionById(missionId, countryCode, abortSignal).catch(() => null);
        if (!mission?.inApp) return { mission: null, firstName, city, answers: [], motivation };
        const answerById = new Map(answers.map((entry) => [entry.questionId, entry.answer]));
        return {
          mission: trimForCard(mission),
          firstName,
          city,
          motivation,
          answers: mission.inApp.questions.map((question) => ({
            questionId: question.id,
            question: question.label,
            kind: question.kind,
            answer: answerById.get(question.id)?.trim() || null,
          })),
        };
      },
      toModelOutput: ({ output }) => ({
        type: "json",
        value: output.mission
          ? {
              shown: "Draft card shown. The person reviews, edits and sends it themselves.",
              unanswered: output.answers.filter((entry) => !entry.answer).map((entry) => entry.question),
            }
          : { error: "Not a mission posted on Aido. Only applyInApp missions can be applied to here." },
      }),
    }),

    recommendMissions: tool({
      description:
        "Show the person 3 to 5 mission cards chosen from searchMissions results, best first, each with a personal reason.",
      inputSchema: z.object({
        picks: z
          .array(
            z.object({
              missionId: z.string().describe("An id returned by searchMissions."),
              reason: z.string().max(240).describe("One sentence on why this fits them, in their language."),
              firstStep: z.string().max(140).optional().describe("Optional tiny concrete first action."),
            }),
          )
          .min(1)
          .max(MAX_RECOMMENDATIONS),
      }),
      execute: async ({ picks }, { abortSignal }): Promise<RecommendationsOutput> => {
        const missions = await Promise.all(
          picks.map(async (pick) => {
            try {
              return await getMissionById(pick.missionId, countryCode, abortSignal);
            } catch (error) {
              logger.warn("recommend.mission_lookup_failed", { missionId: pick.missionId, error: String(error) });
              return null;
            }
          }),
        );

        const recommendations = picks.flatMap((pick, index) => {
          const mission = missions[index];
          return mission ? [{ mission: trimForCard(mission), reason: pick.reason, firstStep: pick.firstStep }] : [];
        });
        return { recommendations, attribution: getProviderAttribution(countryCode) };
      },
      // The UI gets full mission data; the model only needs to know what was shown.
      toModelOutput: ({ output }) => {
        const shownIds = new Set(output.recommendations.map(({ mission }) => mission.id));
        const leftOut = inAppCandidates.filter((candidate) => !shownIds.has(candidate.id));
        return {
          type: "json",
          value: {
            shown: output.recommendations.map(({ mission }) => ({ id: mission.id, title: mission.title })),
            missingIds: output.recommendations.length === 0 ? "none of the ids were found, search again" : null,
            inAppLeftOut: leftOut.length
              ? `These missions posted on Aido were not shown: ${leftOut.map((candidate) => `${candidate.id} (${candidate.title})`).join("; ")}. Unless one is clearly a different cause or place, call recommendMissions again with them first and the others after, and mention the detail to confirm in the reason.`
              : null,
          },
        };
      },
    }),
  };
}

export function createMatchingAgent({ countryCode, locale }: MatchingAgentOptions) {
  const today = new Date().toISOString().slice(0, 10);
  const { model, providerOptions } = resolveModel();
  return new ToolLoopAgent({
    model,
    providerOptions,
    instructions: buildInstructions(countryCode, locale, today),
    tools: createTools(countryCode),
    stopWhen: isStepCount(MAX_STEPS),
  });
}

export type MatchingAgentUIMessage = InferAgentUIMessage<ReturnType<typeof createMatchingAgent>>;
