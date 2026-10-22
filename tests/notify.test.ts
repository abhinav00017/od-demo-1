// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { bookingEmail, notifyClinic } from "@/lib/bookings/notify";
import type { Booking } from "@/lib/bookings/types";

const booking: Booking = {
  id: "3f2a9c1e-0000-4000-8000-000000000000",
  createdAt: "2026-10-20T04:30:00.000Z",
  clinicSlug: "lotus-clinic",
  name: "Priya Sharma",
  phone: "9876543210",
  visitType: "online",
  date: "2026-10-22",
  slot: "Evening, 5 pm – 7 pm",
  reason: "PCOS",
  status: "new",
  notes: null,
  wantsNewTime: false,
};

afterEach(() => vi.restoreAllMocks());

describe("clinic notification", () => {
  it("does nothing without Resend settings", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchImpl = vi.fn();
    expect(await notifyClinic(booking, { env: {}, fetchImpl })).toBe("skipped");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("notify skipped: not configured");
  });

  it("posts one plain email to Resend", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    const env = { RESEND_API_KEY: "re_test", CLINIC_NOTIFY_EMAIL: "front-desk@example.com" };
    expect(await notifyClinic(booking, { env, fetchImpl, dashboardUrl: "https://x.test/clinic/website/admin" })).toBe("sent");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["front-desk@example.com"]);
    expect(body.subject).toBe("New booking: Priya Sharma, Thu, 22 Oct, Evening, 5 pm – 7 pm");
    expect(body.text).toContain("Visit: Online consultation");
    expect(body.text).toContain("Reference: 3F2A9C1E");
  });

  it("returns failed, and does not throw or log the phone, when Resend errors", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const env = { RESEND_API_KEY: "re_test", CLINIC_NOTIFY_EMAIL: "a@example.com" };
    expect(await notifyClinic(booking, { env, fetchImpl: vi.fn(async () => new Response("no", { status: 422 })) })).toBe("failed");
    expect(await notifyClinic(booking, { env, fetchImpl: vi.fn(async () => Promise.reject(new TypeError("network"))) })).toBe("failed");
    expect(err.mock.calls.flat().join(" ")).not.toContain("9876543210");
  });

  it("puts the phone in the email body for the clinic", () => {
    expect(bookingEmail(booking).text).toContain("Mobile: +91 98765 43210");
  });
});
