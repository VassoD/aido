import { z } from "zod";

import { causeSchema, commitmentSchema } from "@/features/missions/mission";

export const MAX_QUESTIONS = 4;
export const MIN_QUESTIONS = 1;

export const questionKindSchema = z.enum(["short", "long", "yes_no"]);

export const applicationQuestionSchema = z.object({
  id: z.string().min(1).max(20),
  label: z.string().min(3).max(200),
  kind: questionKindSchema,
});
export type ApplicationQuestion = z.infer<typeof applicationQuestionSchema>;

/** What an association reviews and edits before publishing. Shared by the AI output and the publish form. */
export const missionDraftSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(20).max(5000),
  city: z.string().max(120).nullable(),
  locationMode: z.enum(["onsite", "remote", "hybrid"]),
  commitment: commitmentSchema,
  cause: causeSchema,
  skills: z.array(z.string().min(1).max(40)).max(6),
  scheduleText: z.string().max(200).nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  places: z.number().int().min(1).max(10_000).nullable(),
  questions: z.array(applicationQuestionSchema).min(MIN_QUESTIONS).max(MAX_QUESTIONS),
});
export type MissionDraft = z.infer<typeof missionDraftSchema>;
