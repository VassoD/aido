import "server-only";

import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const DEFAULT_OPENAI_MODEL = "gpt-6.1-sol";

interface ModelConfig {
  model: LanguageModel;
  providerOptions: { openai: OpenAILanguageModelResponsesOptions };
}

/** OpenAI Responses API (needed for the built-in web search tool). Reads OPENAI_API_KEY. */
export function resolveModel(): ModelConfig {
  return {
    model: openai(process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL),
    // Matching is a light reasoning task; low effort keeps replies fast in a chat.
    providerOptions: { openai: { reasoningEffort: "low" } },
  };
}
