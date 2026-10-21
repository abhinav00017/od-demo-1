import { clinic, type VisitTypeId } from "./data";

export type BookingInput = {
  name: string;
  phone: string;
  visitType: string;
  date: string;
  slot: string;
  reason: string;
  consent: boolean;
};

export type FieldName = keyof BookingInput;
export type FieldErrors = Partial<Record<FieldName, string>>;

/** Booking opens this many days ahead. */
export const MAX_DAYS_AHEAD = 60;

/** Longest name the form and the API accept. */
export const MAX_NAME = 80;

/** Parses "YYYY-MM-DD" as a local calendar date, not UTC, so the day never shifts. */
export function parseDay(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : undefined;
}

/** Indian mobile number: 10 digits starting 6 to 9, with an optional +91 or 0 in front. */
export function normalisePhone(value: string): string | undefined {
  const digits = value.replace(/[\s-]/g, "").replace(/^(\+91|0091|91(?=\d{10}$)|0(?=\d{10}$))/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : undefined;
}

export function formatDay(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** Checks a booking request. `today` is passed in so tests do not depend on the clock. */
export function validateBooking(input: BookingInput, today: Date): FieldErrors {
  const errors: FieldErrors = {};
  if (input.name.trim().length < 2) errors.name = "Enter your name.";
  else if (input.name.trim().length > MAX_NAME) errors.name = `Enter a name of ${MAX_NAME} characters or fewer.`;
  if (!input.phone.trim()) errors.phone = "Enter your mobile number.";
  else if (!normalisePhone(input.phone)) errors.phone = "Enter a 10-digit mobile number, like 98765 43210.";

  if (!clinic.booking.visitTypes.some((t) => t.id === input.visitType)) errors.visitType = "Choose a clinic visit or an online consultation.";

  const day = parseDay(input.date);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const last = new Date(start);
  last.setDate(last.getDate() + MAX_DAYS_AHEAD);
  if (!input.date) errors.date = "Choose a date.";
  else if (!day) errors.date = "Enter a real date.";
  else if (day < start) errors.date = "Choose today or a later date.";
  else if (day > last) errors.date = `Choose a date in the next ${MAX_DAYS_AHEAD} days.`;
  else if (day.getDay() === 0 && input.visitType === "clinic")
    errors.date = "The clinic is closed on Sundays. Choose another day, or an online consultation.";

  if (!(clinic.booking.slots as readonly string[]).includes(input.slot)) errors.slot = "Choose a time of day.";
  if (!(clinic.booking.reasons as readonly string[]).includes(input.reason)) errors.reason = "Choose a reason for the visit.";
  if (!input.consent) errors.consent = "Tick this box so we can confirm on WhatsApp.";
  return errors;
}

/**
 * Turns an untrusted JSON body into a BookingInput. Wrong types become empty values,
 * so validateBooking reports them as missing. The server runs the same checks as the form.
 */
export function parseBookingBody(body: unknown): BookingInput {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const text = (key: string) => (typeof b[key] === "string" ? (b[key] as string) : "");
  return {
    name: text("name"),
    phone: text("phone"),
    visitType: text("visitType"),
    date: text("date"),
    slot: text("slot"),
    reason: text("reason"),
    consent: b.consent === true,
  };
}

/** The hidden field bots fill in and people never see. A request with it set is dropped. */
export const HONEYPOT_FIELD = "lotus_hp";

/** Short booking reference shown to the patient, from the first 8 characters of the id. */
export function shortBookingId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** The WhatsApp message the clinic would send. The demo only shows it; nothing is sent. */
export function confirmationMessage(input: BookingInput): string {
  const first = input.name.trim().split(/\s+/)[0];
  const type = clinic.booking.visitTypes.find((t) => t.id === (input.visitType as VisitTypeId))?.label.toLowerCase() ?? "visit";
  const day = parseDay(input.date);
  const when = day ? formatDay(day) : input.date;
  const slot = input.slot.split(",")[0].toLowerCase();
  const article = /^[aeiou]/.test(type) ? "an" : "a";
  return `Hi ${first}, thank you for booking with ${clinic.name}. We have your request for ${article} ${type} on ${when}, ${slot}. We will confirm the exact time here within 2 hours.`;
}
