import { createGoogle } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/**
 * Ogi's one model connector. Everything else talks to the model through `getOgiModel()`, so switching provider or
 * model is configuration, not code:
 *   BOT_MODEL_PROVIDER  "gemini" (default). The only provider wired in v1.
 *   BOT_MODEL           the provider's model id. Default "gemini-3.5-flash-lite". Measured on the free tier on
 *                       15 Nov 2026: Ogi replies in 0.7 to 3 s. gemini-3.8-flash took 1.5 to 2 min per reply and
 *                       gemini-3.5-flash about 14 s, too slow for a chat bubble.
 *   GEMINI_API_KEY      the Google AI Studio key. Missing = no model, and the bubble shows "Ogi is resting".
 *
 * FREE TIER IS FOR DEMOS ONLY. Google's free tier may use requests to improve Google's products and has small daily
 * limits. Real clients and real patient chats must move to a paid tier before launch (docs/onlydevs-bot-plan.md, section 5).
 */
export const DEFAULT_PROVIDER = "gemini";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

type Env = Record<string, string | undefined>;

export type OgiModelConfig =
  | { configured: true; provider: "gemini"; modelId: string; apiKey: string }
  | { configured: false; provider: string; modelId: string; reason: "no_key" | "unknown_provider" };

export function ogiModelConfig(env: Env = process.env): OgiModelConfig {
  const provider = (env.BOT_MODEL_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
  if (provider !== "gemini") return { configured: false, provider, modelId: env.BOT_MODEL || "", reason: "unknown_provider" };
  const modelId = (env.BOT_MODEL || DEFAULT_GEMINI_MODEL).trim();
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { configured: false, provider, modelId, reason: "no_key" };
  return { configured: true, provider, modelId, apiKey };
}

/** The model to chat with, or null when none is configured. Null is a normal state ("Ogi is resting"), not an error. */
export function getOgiModel(env: Env = process.env): LanguageModel | null {
  const config = ogiModelConfig(env);
  if (!config.configured) return null;
  return createGoogle({ apiKey: config.apiKey })(config.modelId);
}
