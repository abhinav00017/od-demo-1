// @vitest-environment node
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/bookings/[id]/route";
import { GET as list, POST as book } from "@/app/api/bookings/route";
import { GET as reminders } from "@/app/api/cron/reminders/route";
import { GET as verify, POST as webhook } from "@/app/api/whatsapp/webhook/route";
import { ADMIN_COOKIE, signSession } from "@/lib/admin/auth";
import { memoryStore, resetMemoryStore } from "@/lib/bookings/memory";
import type { NewBooking } from "@/lib/bookings/types";

// Tuesday 20 Oct 2026, 22:00 in India (16:30 UTC). Tomorrow in India is Wednesday 21 Oct.
const NOW = new Date("2026-10-20T16:30:00Z");

const base: NewBooking = {
  clinicSlug: "lotus-clinic",
  name: "Priya Sharma",
  phone: "9876543210",
  visitType: "clinic",
  date: "2026-10-22",
  slot: "Morning, 10 am – 1 pm",
  reason: "Pregnancy care",
};

function req(url: string, init: { method?: string; body?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(`http://localhost${url}`, { method: init.method ?? "GET", headers: init.headers, body: init.body });
}
const adminCookie = () => `${ADMIN_COOKIE}=${signSession("test-secret")}`;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const confirm = (id: string) =>
  PATCH(req(`/api/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status: "confirmed" }), headers: { cookie: adminCookie(), "content-type": "application/json" } }), ctx(id));
const messagesFor = (id: string) => memoryStore.listMessagesForBookings([id]);
const logs: string[] = [];

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  resetMemoryStore();
  logs.length = 0;
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("ADMIN_PASSWORD", "open-sesame");
  vi.stubEnv("ADMIN_SECRET", "test-secret");
  vi.stubEnv("WHATSAPP_TOKEN", "");
  vi.stubEnv("WHATSAPP_FAKE", "");
  vi.stubEnv("WHATSAPP_TEMPLATE_CONFIRM", "");
  vi.stubEnv("WHATSAPP_TEMPLATE_REMINDER", "");
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "verify-me");
  vi.stubEnv("WHATSAPP_APP_SECRET", "");
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.stubEnv("CLINIC_WHATSAPP", "");
  vi.stubEnv("WHATSAPP_TEMPLATE_CLINIC_ALERT", "");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("CLINIC_NOTIFY_EMAIL", "");
  for (const level of ["log", "error", "warn", "info"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Confirm sends the WhatsApp confirmation", () => {
  it("logs a sent message through the fake sender, and GET shows it", async () => {
    const b = await memoryStore.create(base);
    const res = await confirm(b.id);
    expect(res.status).toBe(200);
    await vi.waitFor(async () => expect(await messagesFor(b.id)).toHaveLength(1));
    const [m] = await messagesFor(b.id);
    expect(m).toMatchObject({ kind: "confirmation", status: "sent", toMasked: "••••3210", template: "hello_world" });
    expect(logs).toContain("whatsapp (fake): template hello_world to ••••3210");
    expect(logs.join("\n")).not.toMatch(/9876543210|Priya/);

    const data = await (await list(req("/api/bookings", { headers: { cookie: adminCookie() } }))).json();
    expect(data.bookings[0].whatsapp).toEqual({ kind: "confirmation", status: "sent", error: null, at: m.updatedAt });
  });

  it("still confirms, and logs a failed row, when the real send fails", async () => {
    vi.stubEnv("WHATSAPP_TOKEN", "tok");
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const b = await memoryStore.create(base);
    const res = await confirm(b.id);
    expect(res.status).toBe(200);
    expect((await res.json()).booking.status).toBe("confirmed");
    await vi.waitFor(async () => expect((await messagesFor(b.id))[0]?.status).toBe("failed"));
    expect(logs.join("\n")).not.toContain("tok");
  });

  it("still confirms when the message log itself fails", async () => {
    vi.spyOn(memoryStore, "logMessage").mockRejectedValue(new Error('relation "messages" does not exist'));
    const b = await memoryStore.create(base);
    expect((await confirm(b.id)).status).toBe(200);
    await vi.waitFor(() => expect(logs.some((l) => l.startsWith("whatsapp confirmation not logged"))).toBe(true));
  });

  it("does not send a second confirmation for the same booking", async () => {
    const b = await memoryStore.create(base);
    await confirm(b.id);
    await vi.waitFor(async () => expect(await messagesFor(b.id)).toHaveLength(1));
    await confirm(b.id);
    await new Promise((r) => setTimeout(r, 20));
    expect(await messagesFor(b.id)).toHaveLength(1);
  });

  it("sends nothing on cancel", async () => {
    const b = await memoryStore.create(base);
    await PATCH(req(`/api/bookings/${b.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }), headers: { cookie: adminCookie() } }), ctx(b.id));
    await new Promise((r) => setTimeout(r, 20));
    expect(await messagesFor(b.id)).toHaveLength(0);
  });
});

describe("new booking alerts the clinic on WhatsApp", () => {
  const form = { ...base, phone: "+91 98765 43210", date: "2026-10-22", consent: true };
  const post = (ip: string) =>
    book(req("/api/bookings", { method: "POST", body: JSON.stringify(form), headers: { "content-type": "application/json", "x-forwarded-for": ip } }));

  it("sends clinic_alert to CLINIC_WHATSAPP through the fake sender, kept off the dashboard line", async () => {
    vi.stubEnv("CLINIC_WHATSAPP", "911234567890");
    const res = await post("203.0.113.21");
    expect(res.status).toBe(201);
    const { id } = await res.json();
    await vi.waitFor(async () => expect(await messagesFor(id)).toHaveLength(1));
    expect((await messagesFor(id))[0]).toMatchObject({ kind: "clinic_alert", status: "sent", toMasked: "••••7890" });
    expect(logs).toContain("whatsapp (fake): template hello_world to ••••7890");
    expect(logs.join("\n")).not.toMatch(/9876543210|1234567890|Priya|Pregnancy/);
    const data = await (await list(req("/api/bookings", { headers: { cookie: adminCookie() } }))).json();
    expect(data.bookings[0].whatsapp).toBeNull();
  });

  it("skips with one log line when CLINIC_WHATSAPP is unset", async () => {
    const res = await post("203.0.113.22");
    expect(res.status).toBe(201);
    await vi.waitFor(() => expect(logs).toContain("whatsapp clinic alert skipped: CLINIC_WHATSAPP not set"));
    expect(await messagesFor((await res.json()).id)).toHaveLength(0);
  });

  it("still saves the booking when the alert send and the log both fail", async () => {
    vi.stubEnv("CLINIC_WHATSAPP", "911234567890");
    vi.stubEnv("WHATSAPP_TOKEN", "tok");
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    vi.spyOn(memoryStore, "logMessage").mockRejectedValue(new Error("db down"));
    const res = await post("203.0.113.23");
    expect(res.status).toBe(201);
    expect(await memoryStore.list({ from: "2000-01-01" })).toHaveLength(1);
    await vi.waitFor(() => expect(logs.some((l) => l.startsWith("whatsapp clinic_alert not logged"))).toBe(true));
  });
});

describe("webhook", () => {
  const verifyUrl = (token: string) => `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=12345`;

  it("echoes the challenge only for the right verify token", async () => {
    const good = await verify(req(verifyUrl("verify-me")));
    expect(good.status).toBe(200);
    expect(await good.text()).toBe("12345");
    expect((await verify(req(verifyUrl("wrong")))).status).toBe(403);
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "");
    expect((await verify(req(verifyUrl("")))).status).toBe(403);
  });

  const statusBody = (id: string, status: string, errors?: unknown[]) =>
    JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { statuses: [{ id, status, recipient_id: "919876543210", errors }] } }] }] });

  it("updates the message log by provider id, forward only", async () => {
    const b = await memoryStore.create(base);
    await memoryStore.logMessage({ bookingId: b.id, kind: "confirmation", toMasked: "••••3210", template: "hello_world", status: "sent", providerMessageId: "wamid.X" });
    expect((await webhook(req("/api/whatsapp/webhook", { method: "POST", body: statusBody("wamid.X", "read") }))).status).toBe(200);
    expect((await messagesFor(b.id))[0].status).toBe("read");
    await webhook(req("/api/whatsapp/webhook", { method: "POST", body: statusBody("wamid.X", "delivered") }));
    expect((await messagesFor(b.id))[0].status).toBe("read");
    await webhook(req("/api/whatsapp/webhook", { method: "POST", body: statusBody("wamid.X", "failed", [{ code: 131026, title: "Message undeliverable" }]) }));
    expect((await messagesFor(b.id))[0]).toMatchObject({ status: "failed", error: "131026: Message undeliverable" });
    expect(logs).toContain("whatsapp webhook: WHATSAPP_APP_SECRET not set, signature not checked");
    expect(logs.join("\n")).not.toContain("919876543210");
  });

  it("checks the signature when the app secret is set", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "app-secret");
    const b = await memoryStore.create(base);
    await memoryStore.logMessage({ bookingId: b.id, kind: "confirmation", toMasked: "••••3210", template: "hello_world", status: "sent", providerMessageId: "wamid.Y" });
    const body = statusBody("wamid.Y", "delivered");
    expect((await webhook(req("/api/whatsapp/webhook", { method: "POST", body, headers: { "x-hub-signature-256": "sha256=00" } }))).status).toBe(401);
    expect((await messagesFor(b.id))[0].status).toBe("sent");
    const sig = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;
    expect((await webhook(req("/api/whatsapp/webhook", { method: "POST", body, headers: { "x-hub-signature-256": sig } }))).status).toBe(200);
    expect((await messagesFor(b.id))[0].status).toBe("delivered");
  });

  it("logs an inbound text in one line with no number or text, and answers 200 to junk", async () => {
    const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: "919876543210", type: "text", text: { body: "Can I come at 11?" } }] } }] }] });
    expect((await webhook(req("/api/whatsapp/webhook", { method: "POST", body }))).status).toBe(200);
    expect(logs).toContain("whatsapp inbound: text message (17 chars)");
    expect(logs.join("\n")).not.toMatch(/919876543210|come at 11/);
    expect((await webhook(req("/api/whatsapp/webhook", { method: "POST", body: "not json" }))).status).toBe(200);
  });
});

describe("reminder cron", () => {
  const run = (auth?: string) => reminders(req("/api/cron/reminders", { headers: auth ? { authorization: auth } : {} }));

  it("needs the bearer secret, and refuses when CRON_SECRET is unset", async () => {
    expect((await run()).status).toBe(401);
    expect((await run("Bearer nope")).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await run("Bearer ")).status).toBe(503);
  });

  it("reminds only tomorrow's confirmed bookings (India time), once", async () => {
    const tomorrow = await memoryStore.create({ ...base, date: "2026-10-21", name: "Tara" });
    const tomorrowNew = await memoryStore.create({ ...base, date: "2026-10-21", name: "Nisha" });
    const later = await memoryStore.create({ ...base, date: "2026-10-22", name: "Later" });
    const alreadyReminded = await memoryStore.create({ ...base, date: "2026-10-21", name: "Done" });
    for (const b of [tomorrow, later, alreadyReminded]) await memoryStore.updateStatus(b.id, "confirmed");
    await memoryStore.logMessage({ bookingId: alreadyReminded.id, kind: "reminder", toMasked: "••••3210", template: "hello_world", status: "sent" });

    const res = await run("Bearer cron-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: "2026-10-21", due: 2, sent: 1, failed: 0, skipped: 1 });
    expect((await messagesFor(tomorrow.id)).map((m) => m.kind)).toEqual(["reminder"]);
    expect(await messagesFor(tomorrowNew.id)).toHaveLength(0);
    expect(await messagesFor(later.id)).toHaveLength(0);

    expect(await (await run("Bearer cron-secret")).json()).toMatchObject({ sent: 0, skipped: 2 });
  });
});
