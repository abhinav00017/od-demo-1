import { SKIPPED_DEMO } from "./demoPhones";
import { latestByBooking, type Booking, type BookingStore, type DashboardBooking, type MessageLog, type WhatsAppSummary } from "./types";

export function toSummary(m: MessageLog | undefined): WhatsAppSummary | null {
  if (!m) return null;
  return { kind: m.kind, status: m.status, error: m.error, at: m.updatedAt, provider: m.provider, ...(m.template === SKIPPED_DEMO ? { skipped: true } : {}) };
}

/**
 * Adds each booking's latest WhatsApp message, as the dashboard shows it.
 * The row shows what the patient got, so the clinic's own alert is left out, and so are the patient's own messages.
 * A patient tapping Confirm (patient_confirmed) stays in: the row says so.
 * The message log is extra. If it fails (say the table is not migrated yet), the bookings still load.
 */
export async function withWhatsApp(store: BookingStore, list: Booking[]): Promise<DashboardBooking[]> {
  let latest = new Map<string, MessageLog>();
  if (list.length) {
    try {
      const sent = await store.listMessagesForBookings(list.map((b) => b.id));
      latest = latestByBooking(sent.filter((m) => m.kind !== "clinic_alert" && m.kind !== "inbound"));
    } catch (err) {
      console.error(`message list failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }
  return list.map((b) => ({ ...b, whatsapp: toSummary(latest.get(b.id)) }));
}
