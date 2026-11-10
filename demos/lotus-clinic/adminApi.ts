import type { BookingSource, BookingStatus, DashboardBooking, PatientNotes, PatientSummary } from "@/lib/bookings/types";

/** A staff booking from the New booking dialog. */
export type StaffBookingInput = {
  name: string;
  phone: string;
  date: string;
  slot: string;
  visitType: string;
  reason: string;
  source: BookingSource;
  sendWhatsApp: boolean;
};

export type CreateResult = { ok: true; booking: DashboardBooking } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Everything the dashboard loads on demand. The live lists come from AdminApp's poll instead. */
export type AdminApi = {
  past(opts: { from: string; to: string; status?: BookingStatus }): Promise<DashboardBooking[]>;
  search(q: string): Promise<DashboardBooking[]>;
  patients(): Promise<PatientSummary[]>;
  patient(bookingId: string): Promise<{ visits: DashboardBooking[]; notes: PatientNotes | null }>;
  saveNotes(bookingId: string, notes: string): Promise<PatientNotes>;
  createBooking(input: StaffBookingInput): Promise<CreateResult>;
  resetDemo(): Promise<{ deleted: number; inserted: number }>;
};

/** Thrown on 401, so the app can show the login again. */
export class LoggedOutError extends Error {}

async function call<T>(url: string, init?: { method: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    cache: "no-store",
    headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 401) throw new LoggedOutError("Logged out");
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

/** The real API, over fetch. Phone numbers only ever travel in request bodies, never in URLs. */
export const httpAdminApi: AdminApi = {
  async past({ from, to, status }) {
    const q = new URLSearchParams({ from, to, ...(status ? { status } : {}) });
    return (await call<{ bookings: DashboardBooking[] }>(`/api/admin/bookings?${q}`)).bookings;
  },
  async search(q) {
    return (await call<{ bookings: DashboardBooking[] }>("/api/admin/search", { method: "POST", body: { q } })).bookings;
  },
  async patients() {
    return (await call<{ patients: PatientSummary[] }>("/api/admin/patients")).patients;
  },
  async patient(bookingId) {
    const data = await call<{ visits: DashboardBooking[]; notes: PatientNotes | null }>(`/api/admin/patients/${encodeURIComponent(bookingId)}`);
    return { visits: data.visits, notes: data.notes };
  },
  async saveNotes(bookingId, notes) {
    return (await call<{ notes: PatientNotes }>(`/api/admin/patients/${encodeURIComponent(bookingId)}`, { method: "PUT", body: { notes } })).notes;
  },
  async createBooking(input) {
    const res = await fetch("/api/admin/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    if (res.status === 401) throw new LoggedOutError("Logged out");
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; booking?: DashboardBooking; error?: string; fieldErrors?: Record<string, string> };
    if (res.ok && data.ok && data.booking) return { ok: true, booking: data.booking };
    return { ok: false, error: data.error ?? "Could not save the booking. Try again.", fieldErrors: data.fieldErrors };
  },
  async resetDemo() {
    const data = await call<{ deleted: number; inserted: number }>("/api/admin/demo/reset", { method: "POST" });
    return { deleted: data.deleted, inserted: data.inserted };
  },
};

/** Wraps an API so any call that finds the session gone runs `then` (AdminApp shows the login again), and still fails. */
export function onLoggedOut(api: AdminApi, then: () => void): AdminApi {
  const wrapped = {} as Record<string, unknown>;
  for (const [name, fn] of Object.entries(api) as [string, (...a: unknown[]) => Promise<unknown>][]) {
    wrapped[name] = async (...args: unknown[]) => {
      try {
        return await fn(...args);
      } catch (err) {
        if (err instanceof LoggedOutError) then();
        throw err;
      }
    };
  }
  return wrapped as AdminApi;
}
