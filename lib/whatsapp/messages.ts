import { clinic } from "@/demos/lotus-clinic/data";
import type { Booking } from "@/lib/bookings/types";
import { patientPageUrl } from "@/lib/bookings/viewToken";
import type { TemplateComponent } from "./client";
import { HELLO_WORLD, whatsappSettings } from "./index";
import { fill, PATIENT_BODIES, patientParams, shortDate, VIEW_OR_CHANGE, VISIT_MOVED_BUTTONS, type PatientKind } from "./texts";
import { twilioContentSid } from "./twilio";

export { shortDate } from "./texts";

type Env = Record<string, string | undefined>;

/** The kinds this build sends. Cancellation waits for its own template. */
export type SendKind = PatientKind | "clinic_alert";

/** Kinds that go to the patient, not the clinic. Consent, opt-out and No-WhatsApp checks apply to these. */
export const PATIENT_KINDS: readonly SendKind[] = ["request_received", "confirmation", "reminder", "visit_moved"];

/** What to send for one booking: template, language, body parameters, and the text the real template would show. */
export type BuiltMessage = {
  kind: SendKind;
  template: string;
  language: string;
  /** Empty for hello_world, which takes no parameters. */
  components: TemplateComponent[];
  /** Body parameters in {{1}}.. order. See TEMPLATE_BODIES for what each one is. */
  params: string[];
  /** The custom template's body with the parameters filled in: what the patient reads above any buttons. */
  preview: string;
  /**
   * The plain-text message for a Twilio send without a content template (Body, inside a 24 h session only).
   * The body, plus the patient page link where the template has a link button, or "Reply Confirm or Change" where it has quick replies.
   */
  text: string;
  /** The same text with names and reasons swapped for labels. The only form that goes to logs. */
  logPreview: string;
  /** Twilio Content Template sid for this kind, from TWILIO_CONTENT_SID_*. Unset = Twilio sends `text` as Body. */
  contentSid?: string;
  /** True when this kind has no sid of its own and borrows TWILIO_CONTENT_SID_CONFIRM. */
  contentSidReused: boolean;
  /** Twilio ContentVariables, keys "1", "2", ... See CONTENT_VARIABLES. */
  contentVariables: Record<string, string>;
  /** The same variables with names swapped for labels, and the token cut. The only form that goes to logs. */
  logContentVariables: Record<string, string>;
};

/**
 * The custom templates, as they should be created in WhatsApp Manager and Twilio's Content Template Builder.
 * docs/whatsapp-templates.md copies these. Patient bodies live in texts.ts, so the booking page shows the same words.
 * Clinic alert: {{1}} full name, {{2}} visit type, {{3}} date, {{4}} slot, {{5}} reason.
 */
export const TEMPLATE_BODIES: Record<SendKind, string> = {
  ...PATIENT_BODIES,
  clinic_alert: "New booking: {{1}} ({{2}}), {{3}} {{4}}, reason {{5}}. Open the dashboard to confirm.",
};

/** Personal parameters, by position, and the label logs show instead. Patient templates carry none; the reminder link is cut. */
const REDACT: Record<SendKind, Record<number, string>> = {
  request_received: {},
  confirmation: {},
  reminder: { 2: "[patient link]" },
  visit_moved: {},
  clinic_alert: { 0: "[name]", 4: "[reason]" },
};

/** One value a Twilio content variable can carry. */
export type ContentField = "date" | "slot" | "token" | "link" | "firstNameAndVisit" | "dateAndSlot";

/**
 * Twilio Content Template variables per kind, in {{1}}, {{2}}.. order. Reorder or swap fields here to match a new template.
 * Patient templates: {{1}} date, {{2}} slot. The confirmation's {{3}} is the token at the end of its "View or change" URL button;
 * the reminder's {{3}} is the whole patient page link in the body. Clinic alert: {{1}} first name and visit type, {{2}} date and slot.
 * docs/whatsapp-templates.md has the bodies these fit.
 */
export const CONTENT_VARIABLES: Record<SendKind, ContentField[]> = {
  request_received: ["date", "slot"],
  confirmation: ["date", "slot", "token"],
  reminder: ["date", "slot", "link"],
  visit_moved: ["date", "slot"],
  clinic_alert: ["firstNameAndVisit", "dateAndSlot"],
};

/** WhatsApp wants E.164 without the plus. The booking keeps 10 Indian digits. */
export function whatsappNumber(phone: string) {
  return `91${phone}`;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

const visitLabel = (b: Booking) => clinic.booking.visitTypes.find((t) => t.id === b.visitType)?.label ?? b.visitType;

/** The patient's page link for a booking, on WHATSAPP_PUBLIC_URL (or the live demo). Empty when the booking has no token. */
export function patientLink(b: Pick<Booking, "viewToken">, env: Env = process.env) {
  return b.viewToken ? patientPageUrl(whatsappSettings(env).publicUrl, b.viewToken) : "";
}

function contentField(field: ContentField, b: Booking, env: Env, redact: boolean) {
  const name = redact ? "[first name]" : firstName(b.name);
  switch (field) {
    case "date":
      return shortDate(b.date);
    case "slot":
      return b.slot;
    case "token":
      return redact ? "[token]" : (b.viewToken ?? "");
    case "link":
      return redact ? "[patient link]" : patientLink(b, env);
    case "firstNameAndVisit":
      return `${name} (${visitLabel(b)})`;
    case "dateAndSlot":
      return `${shortDate(b.date)}, ${b.slot}`;
  }
}

/** Twilio ContentVariables for a kind and booking: {"1": .., "2": ..}. `redact` swaps names and tokens for labels, for logs. */
export function contentVariablesFor(kind: SendKind, b: Booking, redact = false, env: Env = process.env): Record<string, string> {
  return Object.fromEntries(CONTENT_VARIABLES[kind].map((field, i) => [String(i + 1), contentField(field, b, env, redact)]));
}

function paramsFor(kind: SendKind, b: Booking, env: Env) {
  if (kind === "clinic_alert") return [b.name.trim(), visitLabel(b), shortDate(b.date), b.slot, b.reason];
  return patientParams(kind, b, patientLink(b, env));
}

/** Meta components: the body parameters, plus the confirmation's URL button token or the visit-moved quick replies. */
function metaComponents(kind: SendKind, b: Booking, params: string[]): TemplateComponent[] {
  const out: TemplateComponent[] = [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }];
  if (kind === "confirmation" && b.viewToken) out.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: b.viewToken }] });
  if (kind === "visit_moved") {
    VISIT_MOVED_BUTTONS.forEach((label, i) =>
      out.push({ type: "button", sub_type: "quick_reply", index: String(i), parameters: [{ type: "payload", payload: label.toLowerCase() }] }),
    );
  }
  return out;
}

/** The Body a Twilio send without a content template gets: no buttons there, so the link or the reply words go in the text. */
function plainText(kind: SendKind, preview: string, link: string) {
  if (kind === "confirmation" && link) return `${preview}\n${VIEW_OR_CHANGE}: ${link}`;
  if (kind === "visit_moved") return `${preview}\nReply ${VISIT_MOVED_BUTTONS.join(" or ")}.`;
  return preview;
}

export function buildMessage(kind: SendKind, b: Booking, env: Env = process.env): BuiltMessage {
  const settings = whatsappSettings(env);
  const template = settings.templates[kind];
  const params = paramsFor(kind, b, env);
  const isHello = template === HELLO_WORLD;
  const preview = fill(TEMPLATE_BODIES[kind], params);
  const content = twilioContentSid(kind, env);
  const redacted = params.map((p, i) => REDACT[kind][i] ?? p);
  return {
    kind,
    template,
    // hello_world only exists in en_US on the test number.
    language: isHello ? "en_US" : settings.language,
    components: isHello ? [] : metaComponents(kind, b, params),
    params,
    preview,
    text: plainText(kind, preview, patientLink(b, env)),
    logPreview: plainText(kind, fill(TEMPLATE_BODIES[kind], redacted), b.viewToken ? "[patient link]" : ""),
    contentSid: content.sid,
    contentSidReused: content.reused,
    contentVariables: contentVariablesFor(kind, b, false, env),
    logContentVariables: contentVariablesFor(kind, b, true, env),
  };
}

export const requestReceivedFor = (b: Booking, env: Env = process.env) => buildMessage("request_received", b, env);
export const confirmationFor = (b: Booking, env: Env = process.env) => buildMessage("confirmation", b, env);
export const reminderFor = (b: Booking, env: Env = process.env) => buildMessage("reminder", b, env);
export const visitMovedFor = (b: Booking, env: Env = process.env) => buildMessage("visit_moved", b, env);
export const clinicAlertFor = (b: Booking, env: Env = process.env) => buildMessage("clinic_alert", b, env);
