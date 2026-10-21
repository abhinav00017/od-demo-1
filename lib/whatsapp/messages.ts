import { clinic } from "@/demos/lotus-clinic/data";
import type { Booking } from "@/lib/bookings/types";
import type { TemplateComponent } from "./client";
import { HELLO_WORLD, whatsappSettings } from "./index";

type Env = Record<string, string | undefined>;

/** The kinds this build sends. Cancellation waits for its own template. */
export type SendKind = "confirmation" | "reminder" | "clinic_alert";

/** What to send for one booking: template, language, body parameters, and the text the real template would show. */
export type BuiltMessage = {
  kind: SendKind;
  template: string;
  language: string;
  /** Empty for hello_world, which takes no parameters. */
  components: TemplateComponent[];
  /** Body parameters in {{1}}.. order. See TEMPLATE_BODIES for what each one is. */
  params: string[];
  /** The custom template's text with the parameters filled in. */
  preview: string;
  /** The same text with names and reasons swapped for labels. The only form that goes to logs. */
  logPreview: string;
};

/**
 * The three custom templates, as they should be created in WhatsApp Manager. docs/whatsapp-templates.md copies these.
 * Patient templates: {{1}} first name, {{2}} clinic, {{3}} date, {{4}} slot, {{5}} visit type.
 * Clinic alert: {{1}} full name, {{2}} visit type, {{3}} date, {{4}} slot, {{5}} reason.
 */
export const TEMPLATE_BODIES: Record<SendKind, string> = {
  confirmation: "Hello {{1}}, your visit at {{2}} is confirmed for {{3}}, {{4}}. Visit type: {{5}}. Reply to this message if you need to change it.",
  reminder: "Hello {{1}}, this is a reminder from {{2}}. Your visit is tomorrow, {{3}}, {{4}}. Visit type: {{5}}. Reply to this message if you need to change it.",
  clinic_alert: "New booking: {{1}} ({{2}}), {{3}} {{4}}, reason {{5}}. Open the dashboard to confirm.",
};

/** Personal parameters, by position, and the label logs show instead. */
const REDACT: Record<SendKind, Record<number, string>> = {
  confirmation: { 0: "[first name]" },
  reminder: { 0: "[first name]" },
  clinic_alert: { 0: "[name]", 4: "[reason]" },
};

/** WhatsApp wants E.164 without the plus. The booking keeps 10 Indian digits. */
export function whatsappNumber(phone: string) {
  return `91${phone}`;
}

/** "2026-10-24" -> "Sat 24 Oct". UTC on both sides, so the day never shifts. */
export function shortDate(day: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function fill(body: string, params: string[]) {
  return body.replace(/\{\{(\d)\}\}/g, (_, n: string) => params[Number(n) - 1] ?? "");
}

function paramsFor(kind: SendKind, b: Booking) {
  const visit = clinic.booking.visitTypes.find((t) => t.id === b.visitType)?.label ?? b.visitType;
  if (kind === "clinic_alert") return [b.name.trim(), visit, shortDate(b.date), b.slot, b.reason];
  return [firstName(b.name), clinic.name, shortDate(b.date), b.slot, visit];
}

export function buildMessage(kind: SendKind, b: Booking, env: Env = process.env): BuiltMessage {
  const settings = whatsappSettings(env);
  const template = settings.templates[kind];
  const params = paramsFor(kind, b);
  const isHello = template === HELLO_WORLD;
  return {
    kind,
    template,
    // hello_world only exists in en_US on the test number.
    language: isHello ? "en_US" : settings.language,
    components: isHello ? [] : [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
    params,
    preview: fill(TEMPLATE_BODIES[kind], params),
    logPreview: fill(TEMPLATE_BODIES[kind], params.map((p, i) => REDACT[kind][i] ?? p)),
  };
}

export const confirmationFor = (b: Booking, env: Env = process.env) => buildMessage("confirmation", b, env);
export const reminderFor = (b: Booking, env: Env = process.env) => buildMessage("reminder", b, env);
export const clinicAlertFor = (b: Booking, env: Env = process.env) => buildMessage("clinic_alert", b, env);
