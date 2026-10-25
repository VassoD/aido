import { z } from "zod";

import { causeSchema } from "@/features/missions/mission";

export const MAX_TAGS = 12;
export const MAX_TAG_LENGTH = 40;
const LINKEDIN_HOST = /^([a-z]{2,3}\.)?linkedin\.com$/i;

const tagSchema = z
  .string()
  .transform((tag) => tag.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1).max(MAX_TAG_LENGTH));

const badgeCauseSchema = causeSchema.exclude(["other"]);

export const understoodSchema = z.object({
  causes: z.array(badgeCauseSchema).max(MAX_TAGS),
  interests: z.array(tagSchema).max(MAX_TAGS),
  skills: z.array(tagSchema).max(MAX_TAGS),
});
export type Understood = z.infer<typeof understoodSchema>;

/** Reads stored tags leniently: one stale value is dropped instead of hiding the whole list. */
export function toUnderstood(raw: { causes: readonly string[]; interests: readonly string[]; skills: readonly string[] }): Understood {
  const keep = <TValue,>(values: readonly string[], schema: z.ZodType<TValue, string>): TValue[] =>
    values.flatMap((value) => {
      const parsed = schema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    });
  return {
    causes: keep(raw.causes, badgeCauseSchema).slice(0, MAX_TAGS),
    interests: keep(raw.interests, tagSchema).slice(0, MAX_TAGS),
    skills: keep(raw.skills, tagSchema).slice(0, MAX_TAGS),
  };
}

/** Newest first, case-insensitive duplicates dropped, oldest trimmed past the cap. */
export function mergeTags<TTag extends string>(incoming: readonly TTag[], existing: readonly TTag[]): TTag[] {
  const seen = new Set<string>();
  const merged: TTag[] = [];
  for (const tag of [...incoming, ...existing]) {
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(tag);
  }
  return merged.slice(0, MAX_TAGS);
}

/** Empty string clears the link; anything else must be a LinkedIn address, pasted with or without https://. */
export const linkedinUrlSchema = z
  .string()
  .transform((value) => (value ? value.replace(/^(https?:\/\/)?/i, "https://") : value))
  .pipe(z.union([z.literal(""), z.url({ protocol: /^https$/, hostname: LINKEDIN_HOST }).max(300)]));
