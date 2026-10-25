export const YES_NO_OPTIONS = ["yes", "no"] as const;
export type YesNo = (typeof YES_NO_OPTIONS)[number];

// The AI may answer in the question's language or with a short sentence ("Oui, sans problème").
const YES_PATTERN = /^\s*(yes|yeah|yep|sure|of course|absolutely|oui|ouais|bien sûr|bien sur|tout à fait|evidemment|évidemment)\b/i;
const NO_PATTERN = /^\s*(no|nope|not really|absolutely not|non|pas vraiment|absolument pas)\b/i;

/** Reads a drafted answer to a yes/no question. Null when it is neither, so the volunteer picks. */
export function parseYesNo(answer: string | null | undefined): YesNo | null {
  if (!answer) return null;
  if (NO_PATTERN.test(answer)) return "no";
  if (YES_PATTERN.test(answer)) return "yes";
  return null;
}
