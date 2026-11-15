import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { clinic } from "@/demos/lotus-clinic/data";
import { formatDay, normalisePhone, parseDay, validateBooking } from "@/demos/lotus-clinic/booking";
import { CONSENT_TEXT_V1 } from "@/lib/bookings/consent";
import type { OrgId } from "@/lib/orgs";
import { signConfirm, type PendingVisit } from "./confirmToken";
import { logOgi } from "./log";
import { INFO_TOPICS, type OgiProfile } from "./profiles";

/**
 * Ogi's tools, and who may use them.
 *
 * Lock 2: a per-role allow-list in code, deny by default. A role that is not listed gets no tools at all.
 * Lock 3: every tool reads the business and its organization from the server closure `ctx`. No input schema has a business id, a page,
 *         a role or anything like it, so nothing the model writes can point a tool at another business.
 * The model can never create a booking: request_visit only signs a summary for the visitor's Confirm click.
 */
export const TOOL_NAMES = ["clinic_info", "request_visit", "hand_over"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/** v1 has one role. There is no owner mode in v1: owner tools do not exist, so no input can reach them. */
export const ROLES = ["visitor"] as const;
export type Role = (typeof ROLES)[number];

const ROLE_TOOLS: Readonly<Record<Role, readonly ToolName[]>> = Object.freeze({
  visitor: Object.freeze(["clinic_info", "request_visit", "hand_over"] as const),
});

/** The tools a role may use on a profile: on the role's list AND switched on for the profile. Unknown role = none. */
export function allowedTools(role: string, profile: OgiProfile): ToolName[] {
  const list: readonly ToolName[] = Object.hasOwn(ROLE_TOOLS, role) ? ROLE_TOOLS[role as Role] : [];
  return list.filter((name) => profile.tools.includes(name));
}

// --- Input schemas. Exported so the attack tests can prove none of them carries a business field. ---

export const clinicInfoInput = z.strictObject({
  topic: z.enum(INFO_TOPICS).describe("Which part of the clinic's details to look up."),
});

export const requestVisitInput = z.strictObject({
  name: z.string().min(1).max(100).describe("The visitor's full name, as they gave it."),
  phone: z.string().min(1).max(20).describe("The visitor's 10-digit Indian mobile number, as they gave it."),
  visitType: z.enum(clinic.booking.visitTypes.map((t) => t.id) as ["clinic", "online"]).describe("clinic = at the clinic, online = video or phone."),
  date: z.string().max(10).describe("The preferred day as YYYY-MM-DD."),
  slot: z.enum(clinic.booking.slots).describe("The preferred time window."),
  reason: z.enum(clinic.booking.reasons).describe("The reason for the visit."),
});

export const handOverInput = z.strictObject({
  why: z.enum(["visitor_asked", "not_sure", "out_of_scope", "emergency"]).describe("Why the visitor is being handed to the clinic team."),
});

export const TOOL_INPUT_SCHEMAS: Readonly<Record<ToolName, z.ZodType>> = {
  clinic_info: clinicInfoInput,
  request_visit: requestVisitInput,
  hand_over: handOverInput,
};

/** The summary the browser shows with the Confirm button. Built by the server, never by the model. */
export type ConfirmCard = {
  token: string;
  expiresAt: number;
  consentText: string;
  summary: { name: string; phone: string; visitType: string; day: string; slot: string; reason: string };
};

/** Server-side context for one chat request. Built from the page allow-list, never from the model. */
export type ToolContext = {
  profile: OgiProfile;
  /** The organization every tool works for: the profile's, set by the server. v1 tools read no rows with it yet. */
  orgId: OrgId;
  role: Role;
  /** Today in clinic time, YYYY-MM-DD. */
  today: string;
  /** Filled by request_visit. The engine hands it to the browser; the model only hears "summary shown". */
  pending: { card?: ConfirmCard };
  /** Text of every tool result this turn, for the reply check's allowed numbers and amounts. */
  results: string[];
};

function record(ctx: ToolContext, name: ToolName, outcome: string, result: unknown) {
  logOgi({ event: "tool", page: ctx.profile.key, role: ctx.role, tool: name, outcome });
  ctx.results.push(JSON.stringify(result));
  return result;
}

const BUILDERS: Record<ToolName, (ctx: ToolContext) => ToolSet[string]> = {
  clinic_info: (ctx) =>
    tool({
      description: `Look up ${ctx.profile.businessName}'s details: hours, address, contact, services, doctor, visit types and fees, or how booking works. Answer only from what this returns.`,
      inputSchema: clinicInfoInput,
      execute: async ({ topic }) => record(ctx, "clinic_info", topic, { topic, facts: ctx.profile.facts[topic] }),
    }),

  request_visit: (ctx) =>
    tool({
      description:
        "Prepare a visit request once you have the visitor's name, mobile number, visit type, preferred day, time window and reason. " +
        "This does NOT book. It shows the visitor a summary with a Confirm button; only their click sends the request. " +
        "If it returns problems, ask the visitor about those fields.",
      inputSchema: requestVisitInput,
      execute: async (input) => {
        const today = parseDay(ctx.today)!;
        const errors = validateBooking({ ...input, consent: true }, today);
        if (Object.keys(errors).length) return record(ctx, "request_visit", "needs_fixes", { shown: false, problems: errors });
        const visit: PendingVisit = { ...input, name: input.name.trim(), phone: normalisePhone(input.phone)! };
        const signed = signConfirm(ctx.profile.key, visit);
        if (!signed) {
          return record(ctx, "request_visit", "confirm_off", {
            shown: false,
            problems: { booking: "Booking by chat is not available right now. Ask the visitor to use the Book an Appointment page." },
          });
        }
        const visitLabel = clinic.booking.visitTypes.find((t) => t.id === visit.visitType)!.label;
        ctx.pending.card = {
          token: signed.token,
          expiresAt: signed.expiresAt,
          consentText: CONSENT_TEXT_V1,
          summary: { name: visit.name, phone: visit.phone, visitType: visitLabel, day: formatDay(parseDay(visit.date)!), slot: visit.slot, reason: visit.reason },
        };
        // The model hears only that the summary is on screen. No token, no phone.
        return record(ctx, "request_visit", "summary_shown", {
          shown: true,
          note: "The visitor now sees a summary with a Confirm button. Nothing is booked until they press Confirm.",
          day: ctx.pending.card.summary.day,
          slot: visit.slot,
        });
      },
    }),

  hand_over: (ctx) =>
    tool({
      description: `Give the visitor the way to reach the ${ctx.profile.businessName} team: phone and WhatsApp. Use it when they ask for a person, when you are not sure, or for anything you cannot answer.`,
      inputSchema: handOverInput,
      execute: async ({ why }) =>
        record(ctx, "hand_over", why, {
          phone: ctx.profile.contact.phone,
          whatsapp: ctx.profile.contact.whatsappHref,
          hours: ctx.profile.facts.hours,
          ...(why === "emergency" ? { emergency: `Call ${ctx.profile.emergencyNumber} or go to the nearest emergency room now.` } : {}),
        }),
    }),
};

/** The tool set for one request: only the allowed tools, each closed over the server's context. */
export function buildTools(ctx: ToolContext): ToolSet {
  const tools: ToolSet = {};
  for (const name of allowedTools(ctx.role, ctx.profile)) tools[name] = BUILDERS[name](ctx);
  return tools;
}
