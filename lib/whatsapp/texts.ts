/**
 * The words of every patient WhatsApp message, in one place. Pure: no env, no server code, so the booking
 * success screen can show exactly what the server sends (the same function builds both).
 * Bodies use {{1}}, {{2}}.. like WhatsApp templates; docs/whatsapp-templates.md copies them.
 */
import { clinic } from "@/demos/lotus-clinic/data";

/** The patient kinds this build sends. */
export type PatientKind = "request_received" | "confirmation" | "reminder" | "visit_moved";

/**
 * Template bodies. {{1}} day ("Sat 24 Oct"), {{2}} slot window ("Morning, 10 am – 1 pm"), and for the reminder
 * {{3}} the patient's page link. The clinic name is written into the confirmation.
 */
export const PATIENT_BODIES: Record<PatientKind, string> = {
  request_received: "We've received your request for {{1}}, {{2}}. The clinic will confirm on WhatsApp.",
  confirmation: `Your visit at ${clinic.name} is confirmed for {{1}}, {{2}}. You can come any time in this window.`,
  reminder: "See you tomorrow, {{1}}, {{2}}.\nView or change: {{3}}\nReply STOP to stop messages.",
  visit_moved: "Your visit has moved to {{1}}, {{2}}.",
};

/** The URL button's label on the confirmation. */
export const VIEW_OR_CHANGE = "View or change";
/** The quick replies on "visit moved". Their payload ids are the same words in lower case. */
export const VISIT_MOVED_BUTTONS = ["Confirm", "Change"] as const;

/** "2026-10-24" -> "Sat 24 Oct". UTC on both sides, so the day never shifts. */
export function shortDate(day: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

/** Puts params into {{1}}, {{2}}.. */
export function fill(body: string, params: readonly string[]) {
  return body.replace(/\{\{(\d)\}\}/g, (_, n: string) => params[Number(n) - 1] ?? "");
}

type When = { date: string; slot: string };

/** The template parameters, in {{1}}.. order. */
export function patientParams(kind: PatientKind, b: When, link = ""): string[] {
  const base = [shortDate(b.date), b.slot];
  return kind === "reminder" ? [...base, link] : base;
}

/** The message body a patient sees. Identical on the success screen and in the send. */
export function patientText(kind: PatientKind, b: When, link = "") {
  return fill(PATIENT_BODIES[kind], patientParams(kind, b, link));
}

/** "We've received your request for Sat 24 Oct, Morning, 10 am – 1 pm. The clinic will confirm on WhatsApp." */
export const requestReceivedText = (b: When) => patientText("request_received", b);

/** Replies sent back inside the session the patient opened. */
export const replies = {
  confirmed: (b: When) => `Thank you, see you on ${shortDate(b.date)}, ${b.slot}.`,
  change: (link: string) => `No problem. Pick another day or time here: ${link}`,
  stopped: () => `You won't get more WhatsApp messages from ${clinic.name}. Reply START to turn them back on.`,
  started: () => `You'll get WhatsApp messages from ${clinic.name} again. Reply STOP to stop them.`,
};
