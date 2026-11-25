import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { clinic } from "@/demos/lotus-clinic/data";
import { formatDay, normalisePhone, parseDay, validateBooking } from "@/demos/lotus-clinic/booking";
import { EVENT_TYPES, VENUES, eventTypeLabel, slotLabel, venueById } from "@/demos/solstice-cafe/events";
import { CONSENT_TEXT_V1 } from "@/lib/bookings/consent";
import { checkEnquiry } from "@/lib/cafeEvents/validation";
import { MENU_ITEMS } from "@/demos/solstice-cafe/data";
import type { OrgId } from "@/lib/orgs";
import { signConfirm, signEnquiryConfirm, type PendingVisit } from "./confirmToken";
import { logOgi } from "./log";
import {
  enquiryStats,
  enquiryStatsInput,
  listEnquiries,
  listEnquiriesInput,
  orderStats,
  orderStatsInput,
  readEnquiries,
  readOrders,
  resolvePeriod,
  topItems,
  topItemsInput,
  type BotRead,
} from "./cafeOwner";
import { CAFE_INFO_TOPICS, INFO_TOPICS, type OgiProfile } from "./profiles";

/**
 * Ogi's tools, and who may use them.
 *
 * Lock 2: a per-role allow-list in code, deny by default. A role that is not listed gets no tools at all.
 * Lock 3: every tool reads the business and its organization from the server closure `ctx`. No input schema has a business id, a page,
 *         a role or anything like it, so nothing the model writes can point a tool at another business.
 * The model can never create a booking or an enquiry: request_visit and request_event_enquiry only sign a summary for
 * the visitor's Confirm click.
 * Owner tools (25 Nov 2026, cafe only) are read-only: fixed queries in lib/ogi/cafeOwner.ts, through the bot scope,
 * for the profile's organization. The chat route gives the owner role only with a valid cafe_session cookie.
 */
export const OWNER_TOOL_NAMES = ["enquiry_stats", "list_enquiries", "order_stats", "top_items"] as const;
export const TOOL_NAMES = ["clinic_info", "request_visit", "cafe_info", "request_event_enquiry", "hand_over", ...OWNER_TOOL_NAMES] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/** visitor: the public pages. owner: the cafe owner page, only after the server checks the cafe login. */
export const ROLES = ["visitor", "owner"] as const;
export type Role = (typeof ROLES)[number];

const ROLE_TOOLS: Readonly<Record<Role, readonly ToolName[]>> = Object.freeze({
  visitor: Object.freeze(["clinic_info", "request_visit", "cafe_info", "request_event_enquiry", "hand_over"] as const),
  owner: Object.freeze([...OWNER_TOOL_NAMES]),
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

export const cafeInfoInput = z.strictObject({
  topic: z.enum(CAFE_INFO_TOPICS).describe("Which part of the cafe's details to look up."),
});

const SLOT_IDS = [...new Set(VENUES.flatMap((v) => v.slots.map((s) => s.id)))] as [string, ...string[]];

export const requestEventEnquiryInput = z.strictObject({
  venue: z.enum(["courtyard", "conservatory"]).describe("courtyard = The Courtyard, the outdoor garden; conservatory = The Conservatory, the private glass room."),
  eventType: z.enum(EVENT_TYPES.map((t) => t.id) as ["birthday", "small_function", "corporate", "other"]).describe("The type of event."),
  date: z.string().max(10).describe("The event day as YYYY-MM-DD."),
  slot: z.enum(SLOT_IDS).describe("The time slot id: The Courtyard has morning, sundowner, evening; The Conservatory has brunch, afternoon, evening."),
  guests: z.number().int().min(1).max(100).describe("The number of guests."),
  name: z.string().min(1).max(100).describe("The visitor's full name, as they gave it."),
  phone: z.string().min(1).max(20).describe("The visitor's 10-digit Indian mobile number, as they gave it."),
  notes: z.string().max(500).optional().describe("Anything else the visitor asked for, in their words. Optional."),
});

export const handOverInput = z.strictObject({
  why: z.enum(["visitor_asked", "not_sure", "out_of_scope", "emergency"]).describe("Why the visitor is being handed to the clinic team."),
});

export const TOOL_INPUT_SCHEMAS: Readonly<Record<ToolName, z.ZodType>> = {
  clinic_info: clinicInfoInput,
  request_visit: requestVisitInput,
  cafe_info: cafeInfoInput,
  request_event_enquiry: requestEventEnquiryInput,
  hand_over: handOverInput,
  enquiry_stats: enquiryStatsInput,
  list_enquiries: listEnquiriesInput,
  order_stats: orderStatsInput,
  top_items: topItemsInput,
};

/** The visit summary the browser shows with the Confirm button. Built by the server, never by the model. */
export type VisitConfirmCard = {
  token: string;
  expiresAt: number;
  consentText: string;
  summary: { name: string; phone: string; visitType: string; day: string; slot: string; reason: string };
};

/** The event enquiry summary the cafe's bubble shows with the Confirm button. Built by the server, never by the model. */
export type EnquiryConfirmCard = {
  kind: "event_enquiry";
  token: string;
  expiresAt: number;
  /** The line under the Confirm button. */
  note: string;
  summary: { venue: string; event: string; day: string; time: string; guests: string; name: string; phone: string; notes: string };
};

export type ConfirmCard = VisitConfirmCard | EnquiryConfirmCard;

/** Under the enquiry Confirm button. The same promise the venue page's form makes. */
export const ENQUIRY_CONFIRM_NOTE = "No payment now. The cafe calls you to confirm the final quote.";

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
  /** Owner tools only: how to run a fixed read as the bot. Unset = Postgres when DATABASE_URL is set, else memory. Tests pass PGlite. */
  botRead?: BotRead;
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

  cafe_info: (ctx) =>
    tool({
      description: `Look up ${ctx.profile.businessName}'s details: hours, address, contact, the menu with prices, ordering, table reservations, the two event venues (guests, from-prices, time slots, what is included) or how event enquiries work. Answer only from what this returns.`,
      inputSchema: cafeInfoInput,
      execute: async ({ topic }) => record(ctx, "cafe_info", topic, { topic, facts: ctx.profile.facts[topic] }),
    }),

  request_event_enquiry: (ctx) =>
    tool({
      description:
        "Prepare an event enquiry once you have the venue, type of event, date, time slot, number of guests, the visitor's name and mobile number, and any notes. " +
        "This does NOT book or quote. It shows the visitor a summary with a Confirm button; only their click sends the enquiry, and the cafe then calls to confirm the final quote. " +
        "If it returns problems, ask the visitor about those fields.",
      inputSchema: requestEventEnquiryInput,
      execute: async (input) => {
        // The venue page's own schema, with today in India: the same checks as the form and the API.
        const checked = checkEnquiry({ ...input, notes: input.notes ?? "" }, ctx.today);
        if (!checked.ok) return record(ctx, "request_event_enquiry", "needs_fixes", { shown: false, problems: checked.fieldErrors });
        const signed = signEnquiryConfirm(ctx.profile.key, checked.data);
        if (!signed) {
          return record(ctx, "request_event_enquiry", "confirm_off", {
            shown: false,
            problems: { enquiry: "Enquiries by chat are not available right now. Ask the visitor to use the form on the venue page." },
          });
        }
        const e = checked.data;
        const venue = venueById(e.venue)!;
        const day = formatDay(parseDay(e.date)!);
        ctx.pending.card = {
          kind: "event_enquiry",
          token: signed.token,
          expiresAt: signed.expiresAt,
          note: ENQUIRY_CONFIRM_NOTE,
          summary: { venue: venue.name, event: eventTypeLabel(e.eventType), day, time: slotLabel(venue, e.slot), guests: String(e.guests), name: e.name, phone: e.phone, notes: e.notes },
        };
        // The model hears only that the summary is on screen. No token, no phone.
        return record(ctx, "request_event_enquiry", "summary_shown", {
          shown: true,
          note: "The visitor now sees a summary with a Confirm button. Nothing is sent until they press Confirm, and nothing is booked until the cafe calls them.",
          venue: venue.name,
          day,
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

  enquiry_stats: (ctx) =>
    tool({
      description:
        "Count the cafe's event enquiries (leads) for a period, optionally split by status, source, venue, event type, event date, weekday or channel. " +
        "Use it for: how many enquiries, where leads come from (website, Google Ads...), which venue is more popular, which dates or weekdays get most enquiries, how many confirmed events next week (dateBasis event_date, status confirmed).",
      inputSchema: enquiryStatsInput,
      execute: async (input) => {
        const range = resolvePeriod(input.period, ctx.today, input);
        if ("error" in range) return record(ctx, "enquiry_stats", "bad_period", { problem: range.error });
        return record(ctx, "enquiry_stats", input.groupBy ?? "total", enquiryStats(await readEnquiries(ctx.orgId, ctx.botRead), range, input));
      },
    }),

  list_enquiries: (ctx) =>
    tool({
      description: "List up to 10 of the cafe's event enquiries for a period, with name, days, venue, event, guests, status and source. No phone numbers.",
      inputSchema: listEnquiriesInput,
      execute: async (input) => {
        const range = resolvePeriod(input.period, ctx.today, input);
        if ("error" in range) return record(ctx, "list_enquiries", "bad_period", { problem: range.error });
        return record(ctx, "list_enquiries", "listed", listEnquiries(await readEnquiries(ctx.orgId, ctx.botRead), range, input));
      },
    }),

  order_stats: (ctx) =>
    tool({
      description:
        "Orders and sales (₹, incl. GST) for a period, optionally split by item, category, day, weekday, hour or channel. " +
        "Use it for: sales last week, number of orders, average order, busiest day or weekday, busiest hour, orders by channel.",
      inputSchema: orderStatsInput,
      execute: async (input) => {
        const range = resolvePeriod(input.period, ctx.today, input);
        if ("error" in range) return record(ctx, "order_stats", "bad_period", { problem: range.error });
        return record(ctx, "order_stats", input.groupBy ?? "total", orderStats(await readOrders(ctx.orgId, range, ctx.botRead), range, input));
      },
    }),

  top_items: (ctx) =>
    tool({
      description: "The best-selling (or slowest-selling) menu items for a period, by units sold or by sales, at most 10.",
      inputSchema: topItemsInput,
      execute: async (input) => {
        const range = resolvePeriod(input.period, ctx.today, input);
        if ("error" in range) return record(ctx, "top_items", "bad_period", { problem: range.error });
        return record(ctx, "top_items", input.rank, topItems(await readOrders(ctx.orgId, range, ctx.botRead), range, input, MENU_ITEMS));
      },
    }),
};

/** The tool set for one request: only the allowed tools, each closed over the server's context. */
export function buildTools(ctx: ToolContext): ToolSet {
  const tools: ToolSet = {};
  for (const name of allowedTools(ctx.role, ctx.profile)) tools[name] = BUILDERS[name](ctx);
  return tools;
}
