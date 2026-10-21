import { after } from "next/server";
import { clinic } from "@/demos/lotus-clinic/data";
import { formatDay, parseDay, shortBookingId } from "@/demos/lotus-clinic/booking";
import type { Booking } from "./types";

type Env = Record<string, string | undefined>;
export type NotifyResult = "sent" | "skipped" | "failed";

/** Resend's test sender. It can only mail the Resend account's own address until a domain is verified. */
const DEFAULT_FROM = "Lotus demo <onboarding@resend.dev>";

export function bookingEmail(b: Booking, dashboardUrl?: string) {
  const type = clinic.booking.visitTypes.find((t) => t.id === b.visitType)?.label ?? b.visitType;
  const day = parseDay(b.date);
  const when = `${day ? formatDay(day) : b.date}, ${b.slot}`;
  const subject = `New booking: ${b.name}, ${when}`;
  const text = [
    `A new booking came in from the ${clinic.name} website.`,
    "",
    `Name: ${b.name}`,
    `Mobile: +91 ${b.phone.slice(0, 5)} ${b.phone.slice(5)}`,
    `Visit: ${type}`,
    `When: ${when}`,
    `Reason: ${b.reason}`,
    `Reference: ${shortBookingId(b.id)}`,
    "",
    dashboardUrl ? `Confirm or cancel it on the dashboard: ${dashboardUrl}` : "Confirm or cancel it on the clinic dashboard.",
  ].join("\n");
  return { subject, text };
}

/**
 * Emails the clinic about one booking through Resend's REST API.
 * Does nothing unless RESEND_API_KEY and CLINIC_NOTIFY_EMAIL are set. Never throws.
 * Logs carry no phone numbers or names.
 */
export async function notifyClinic(b: Booking, opts: { dashboardUrl?: string; env?: Env; fetchImpl?: typeof fetch } = {}): Promise<NotifyResult> {
  const env = opts.env ?? process.env;
  const key = env.RESEND_API_KEY;
  const to = env.CLINIC_NOTIFY_EMAIL;
  if (!key || !to) {
    console.log("notify skipped: not configured");
    return "skipped";
  }
  const { subject, text } = bookingEmail(b, opts.dashboardUrl);
  try {
    const res = await (opts.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.NOTIFY_FROM || DEFAULT_FROM, to: to.split(",").map((s) => s.trim()), subject, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`notify failed: Resend answered ${res.status} for booking ${shortBookingId(b.id)}`);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error(`notify failed: ${err instanceof Error ? err.name : "error"} for booking ${shortBookingId(b.id)}`);
    return "failed";
  }
}

/**
 * Runs `task` after the response is sent, through Next's after(), so the patient never waits on email.
 * Outside a request (tests, scripts) after() throws; then the task runs in the background instead.
 */
export function runAfterResponse(task: () => Promise<unknown>) {
  const safe = () => task().catch(() => undefined);
  try {
    after(safe);
  } catch {
    void safe();
  }
}
