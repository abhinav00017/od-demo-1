import { generateText, isStepCount, type LanguageModel, type ModelMessage } from "ai";
import { parseDay } from "@/demos/lotus-clinic/booking";
import { logOgi } from "./log";
import { toPlainText } from "./plainText";
import type { OgiProfile } from "./profiles";
import { checkReply, safeHandOver } from "./replyCheck";
import { buildTools, type ConfirmCard, type Role, type ToolContext } from "./tools";

/**
 * One chat turn. The flow, every message:
 *   1. The route maps `page` to a profile through the allow-list and fixes the role ("visitor" in v1).   Lock 1
 *   2. Emergency words get the fixed emergency reply here, in code, before any model is asked.         Clinic rule
 *   3. The tools are built from the role's allow-list, closed over the server's context.               Locks 2, 3
 *   4. The model answers, calling tools if it needs to.
 *   5. The reply check runs on the final text. A blocked reply becomes the safe hand-over message.      Lock 5
 * The prompt below only sets tone and scope. It is not a lock: every rule that can be checked is checked in code.
 */

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type OgiReply = {
  reply: string;
  /** The visit summary with the Confirm button, when request_visit prepared one this turn. */
  confirm?: ConfirmCard;
  /** Set when the reply is the fixed emergency, blocked or error message. */
  kind: "answer" | "emergency" | "blocked" | "error";
};

/** Words that mean "this may be an emergency". Matched in code, so the model cannot talk its way past them. */
const EMERGENCY =
  /\b(emergency|bleeding (?:a lot|heavily|heavy)|heavy bleeding|severe (?:pain|bleeding)|unconscious|fainted|fainting|can'?t breathe|cannot breathe|not breathing|seizure|water (?:has )?broke|waters broke|baby (?:is )?not moving|suicid\w*|kill myself|overdose)\b/i;

export function isEmergency(text: string) {
  return EMERGENCY.test(text);
}

export function emergencyReply(profile: OgiProfile) {
  return `This could be an emergency. Please call ${profile.emergencyNumber} now or go to the nearest emergency room. You can also call ${profile.businessName} on ${profile.contact.phone}.`;
}

function weekday(day: string) {
  return parseDay(day)!.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function buildInstructions(profile: OgiProfile, today: string) {
  return [
    `You are Ogi, the friendly assistant on the ${profile.businessName} website. You speak for this business only.`,
    `Today is ${weekday(today)} (${today}).`,
    "Keep replies short: one to three plain sentences. Be warm and calm.",
    "Write plain text only. No markdown: no asterisks, no bold, no headings, no bullet symbols.",
    "Answer only from the business facts below or from your tools. If a fact is not there, say you don't know and use hand_over.",
    "To request a visit, collect: full name, 10-digit mobile number, clinic visit or online consultation, preferred day, time window and reason. " +
      "Then call request_visit. Never say a visit is booked or confirmed: the visitor must press Confirm on the summary.",
    "Do not repeat the visitor's phone number back in your reply; the summary shows it.",
    "Rules:",
    ...profile.rules.map((r) => `- ${r}`),
    "Business facts (JSON):",
    JSON.stringify(profile.facts),
  ].join("\n");
}

/** The longest Ogi waits for the model. A slower answer becomes the polite hand-over instead of a hanging chat. */
export const MODEL_TIMEOUT_MS = 20_000;

export async function runOgi({
  profile,
  role,
  messages,
  model,
  today,
  timeoutMs = MODEL_TIMEOUT_MS,
}: {
  profile: OgiProfile;
  role: Role;
  messages: ChatMessage[];
  model: LanguageModel;
  today: string;
  timeoutMs?: number;
}): Promise<OgiReply> {
  const last = messages[messages.length - 1];
  if (last?.role === "user" && isEmergency(last.content)) {
    logOgi({ event: "emergency", page: profile.key, role });
    return { reply: emergencyReply(profile), kind: "emergency" };
  }

  const ctx: ToolContext = { profile, orgId: profile.orgId, role, today, pending: {}, results: [] };
  const tools = buildTools(ctx);

  let text: string;
  try {
    const result = await generateText({
      model,
      instructions: buildInstructions(profile, today),
      messages: messages.map((m): ModelMessage => ({ role: m.role, content: m.content })),
      tools,
      stopWhen: isStepCount(4),
      maxOutputTokens: 500,
      temperature: 0.3,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });
    text = toPlainText(result.text);
    // A tool the model asked for that is not in its set never runs; log it so attacks show up.
    for (const step of result.steps) {
      for (const part of step.content) {
        if (part.type === "tool-error") logOgi({ event: "denied_tool", page: profile.key, role, tool: part.toolName.slice(0, 40), outcome: "error" });
      }
    }
  } catch (err) {
    logOgi({ event: "model_error", page: profile.key, role, outcome: err instanceof Error ? err.name : "unknown" });
    return { reply: safeHandOver(profile), kind: "error" };
  }

  if (!text) text = ctx.pending.card ? "Here's your visit request. Please check it and press Confirm to send it to the clinic." : safeHandOver(profile);

  const check = checkReply(text, { profile, toolResults: ctx.results });
  if (!check.ok) {
    logOgi({ event: "reply_blocked", page: profile.key, role, outcome: check.reasons.join(",") });
    return { reply: safeHandOver(profile), kind: "blocked" };
  }
  return { reply: text, kind: "answer", ...(ctx.pending.card ? { confirm: ctx.pending.card } : {}) };
}
