/**
 * Checks for an event enquiry. The same zod schema runs in the browser (the form) and on the server (the API),
 * so both say the same thing. Safe to import from client code: no server-only imports.
 */
import { z } from "zod";
import { EVENT_TYPES, MAX_DAYS_AHEAD, venueById, type Venue } from "@/demos/solstice-cafe/events";
import { ENQUIRY_STATUSES } from "./types";

/** The hidden form field bots fill in. A filled one gets a normal-looking answer from the API and nothing is saved. */
export const HONEYPOT = "company";

/** A 10-digit Indian mobile, typed any common way (+91, 0091, a leading 0, spaces, dashes). 10 digits or undefined. */
export function normaliseMobile(value: string): string | undefined {
  const digits = value.replace(/[\s-]/g, "").replace(/^(\+91|0091|91(?=\d{10}$)|0(?=\d{10}$))/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : undefined;
}

/** Today in India (the cafe's calendar), as YYYY-MM-DD. Servers run in UTC; visitors may be anywhere. */
export function indiaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** A YYYY-MM-DD day plus n days, as YYYY-MM-DD. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function isRealDay(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

const EVENT_TYPE_IDS = EVENT_TYPES.map((t) => t.id) as [(typeof EVENT_TYPES)[number]["id"], ...(typeof EVENT_TYPES)[number]["id"][]];

/** Just the venue, read first so the rest of the schema can use that venue's guests and time slots. */
export const venueField = z.object({ venue: z.enum(["courtyard", "conservatory"], { error: "Choose a venue." }) });

/**
 * The enquiry for one venue. `today` is India's date (indiaToday()). The date must be today or later and at most
 * MAX_DAYS_AHEAD days away. Guests must fit the venue. The phone comes out as 10 digits, the notes trimmed.
 */
export function enquirySchema(venue: Venue, today: string) {
  const last = addDays(today, MAX_DAYS_AHEAD);
  const guestsMessage = `${venue.name} takes ${venue.minGuests} to ${venue.maxGuests} guests.`;
  return z.object({
    venue: z.literal(venue.id, { error: "Choose a venue." }),
    eventType: z.enum(EVENT_TYPE_IDS, { error: "Choose the type of event." }),
    date: z
      .string({ error: "Pick a date." })
      .refine(isRealDay, "Pick a date.")
      .refine((d) => d >= today, "Pick today or a later date.")
      .refine((d) => d <= last, "Pick a date within the next six months."),
    slot: z.enum(venue.slots.map((s) => s.id) as [string, ...string[]], { error: "Choose a time." }),
    guests: z
      .number({ error: "Enter the number of guests." })
      .int("Enter a whole number of guests.")
      .min(venue.minGuests, guestsMessage)
      .max(venue.maxGuests, guestsMessage),
    name: z.string({ error: "Enter your name." }).trim().min(2, "Enter your name.").max(80, "Keep your name under 80 characters."),
    phone: z.string({ error: "Enter your mobile number." }).transform((v, ctx) => {
      const digits = normaliseMobile(v);
      if (!digits) {
        ctx.addIssue({ code: "custom", message: v.trim() ? "Enter a 10-digit Indian mobile number, like 98765 43210." : "Enter your mobile number." });
        return z.NEVER;
      }
      return digits;
    }),
    notes: z.string().trim().max(500, "Keep the notes under 500 characters.").default(""),
  });
}

export type EnquiryInput = z.input<ReturnType<typeof enquirySchema>>;
export type EnquiryData = z.output<ReturnType<typeof enquirySchema>>;

/** The first problem per field, for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "form";
    out[key] ??= issue.message;
  }
  return out;
}

export type EnquiryCheck = { ok: true; data: EnquiryData } | { ok: false; fieldErrors: Record<string, string> };

/** Checks a whole enquiry body: the venue first, then everything else against that venue. */
export function checkEnquiry(body: unknown, today: string): EnquiryCheck {
  const v = venueField.safeParse(body);
  if (!v.success) return { ok: false, fieldErrors: fieldErrors(v.error) };
  const parsed = enquirySchema(venueById(v.data.venue)!, today).safeParse(body);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, fieldErrors: fieldErrors(parsed.error) };
}

export const statusBody = z.object({ status: z.enum(ENQUIRY_STATUSES, { error: "Choose new, contacted, confirmed or declined." }) });
