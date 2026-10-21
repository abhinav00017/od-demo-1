// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryStore, resetMemoryStore } from "@/lib/bookings/memory";
import type { Booking } from "@/lib/bookings/types";
import { cloudSender, fakeSender, getWhatsApp, isConfigured, maskNumber, scrubDigits, whatsappSettings } from "@/lib/whatsapp";
import { clinicAlertFor, confirmationFor, reminderFor, shortDate, whatsappNumber } from "@/lib/whatsapp/messages";
import { sendBookingMessage } from "@/lib/whatsapp/notify";

const booking: Booking = {
  id: "3f2a9c1e-0000-4000-8000-000000000000",
  createdAt: "2026-10-20T04:30:00.000Z",
  clinicSlug: "lotus-clinic",
  name: "Priya Sharma",
  phone: "9876543210",
  visitType: "clinic",
  date: "2026-10-24",
  slot: "Morning, 10 am – 1 pm",
  reason: "Pregnancy care",
  status: "confirmed",
  notes: null,
};

afterEach(() => {
  vi.restoreAllMocks();
  resetMemoryStore();
});

const ok = () => vi.fn(async () => new Response(JSON.stringify({ messaging_product: "whatsapp", messages: [{ id: "wamid.ABC" }] }), { status: 200 }));

describe("cloud client", () => {
  it("posts a template to the Graph v25.0 messages endpoint with the bearer token", async () => {
    const fetchImpl = ok();
    const sender = cloudSender({ token: "tok", phoneNumberId: "1300202886519854", fetchImpl });
    const res = await sender.sendTemplate({
      to: "919876543210",
      template: "lotus_booking_confirmed",
      components: [{ type: "body", parameters: [{ type: "text", text: "Priya" }] }],
    });
    expect(res).toEqual({ ok: true, messageId: "wamid.ABC" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v25.0/1300202886519854/messages");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(String(init.body))).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "919876543210",
      type: "template",
      template: { name: "lotus_booking_confirmed", language: { code: "en_US" }, components: [{ type: "body", parameters: [{ type: "text", text: "Priya" }] }] },
    });
  });

  it("sends hello_world with no components key, and plain text", async () => {
    const fetchImpl = ok();
    const sender = cloudSender({ token: "tok", fetchImpl });
    await sender.sendTemplate({ to: "919876543210", template: "hello_world", components: [] });
    await sender.sendText({ to: "919876543210", body: "Hi" });
    const first = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(first.template).toEqual({ name: "hello_world", language: { code: "en_US" } });
    const [url, init] = fetchImpl.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toContain("/1300202886519854/messages");
    expect(JSON.parse(String(init.body))).toMatchObject({ type: "text", text: { body: "Hi", preview_url: false } });
  });

  it("turns Meta errors and network failures into a short reason, never throwing", async () => {
    const meta = vi.fn(async () => new Response(JSON.stringify({ error: { message: "(#131030) Recipient phone number not in allowed list", code: 131030 } }), { status: 400 }));
    expect(await cloudSender({ token: "t", fetchImpl: meta }).sendTemplate({ to: "919876543210", template: "hello_world" })).toEqual({
      ok: false,
      error: "131030: (#131030) Recipient phone number not in allowed list",
    });
    const down = vi.fn(async () => Promise.reject(new TypeError("fetch failed")));
    const res = await cloudSender({ token: "t", fetchImpl: down }).sendTemplate({ to: "919876543210", template: "hello_world" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/TypeError/);
  });

  it("masks and scrubs numbers", () => {
    expect(maskNumber("919876543210")).toBe("••••3210");
    expect(scrubDigits("bad number +91 98765 43210 here")).toBe("bad number ••• here");
    expect(scrubDigits("131030: not allowed")).toBe("131030: not allowed");
  });
});

describe("picking a sender", () => {
  it("uses the fake without a token, or when WHATSAPP_FAKE=1", () => {
    expect(isConfigured({})).toBe(false);
    expect(getWhatsApp({}).kind).toBe("fake");
    expect(getWhatsApp({ WHATSAPP_TOKEN: "t", WHATSAPP_FAKE: "1" }).kind).toBe("fake");
    expect(getWhatsApp({ WHATSAPP_TOKEN: "t" }).kind).toBe("cloud");
  });

  it("falls back to the test number and hello_world", () => {
    expect(whatsappSettings({})).toEqual({
      phoneNumberId: "1300202886519854",
      templates: { confirmation: "hello_world", reminder: "hello_world", clinic_alert: "hello_world" },
      clinicNumber: "",
      language: "en_US",
    });
  });

  it("the fake logs one masked line and returns a fake id", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await fakeSender.sendTemplate({ to: "919876543210", template: "hello_world" });
    expect(res.ok).toBe(true);
    expect(res.messageId).toMatch(/^wamid\.fake-/);
    expect(log).toHaveBeenCalledWith("whatsapp (fake): template hello_world to ••••3210");
  });
});

describe("message builders", () => {
  it("fills the five body parameters for a custom template", () => {
    const env = { WHATSAPP_TEMPLATE_CONFIRM: "lotus_booking_confirmed", WHATSAPP_TEMPLATE_LANG: "en" };
    const m = confirmationFor(booking, env);
    expect(m.template).toBe("lotus_booking_confirmed");
    expect(m.language).toBe("en");
    expect(m.params).toEqual(["Priya", "Lotus Women's Clinic", "Sat 24 Oct", "Morning, 10 am – 1 pm", "Clinic visit"]);
    expect(m.components).toEqual([{ type: "body", parameters: m.params.map((text) => ({ type: "text", text })) }]);
    expect(m.preview).toBe("Hello Priya, your visit at Lotus Women's Clinic is confirmed for Sat 24 Oct, Morning, 10 am – 1 pm. Visit type: Clinic visit. Reply to this message if you need to change it.");
  });

  it("sends hello_world with no components and en_US", () => {
    const m = reminderFor({ ...booking, visitType: "online" }, { WHATSAPP_TEMPLATE_LANG: "en" });
    expect(m).toMatchObject({ kind: "reminder", template: "hello_world", language: "en_US", components: [] });
    expect(m.preview).toContain("Visit type: Online consultation");
  });

  it("builds the clinic alert with full name, visit type and reason, and a log preview without them", () => {
    const m = clinicAlertFor(booking, { WHATSAPP_TEMPLATE_CLINIC_ALERT: "lotus_new_booking_alert" });
    expect(m.template).toBe("lotus_new_booking_alert");
    expect(m.params).toEqual(["Priya Sharma", "Clinic visit", "Sat 24 Oct", "Morning, 10 am – 1 pm", "Pregnancy care"]);
    expect(m.preview).toBe("New booking: Priya Sharma (Clinic visit), Sat 24 Oct Morning, 10 am – 1 pm, reason Pregnancy care. Open the dashboard to confirm.");
    expect(m.logPreview).toBe("New booking: [name] (Clinic visit), Sat 24 Oct Morning, 10 am – 1 pm, reason [reason]. Open the dashboard to confirm.");
    expect(clinicAlertFor(booking, {}).template).toBe("hello_world");
  });

  it("formats dates without a time-zone shift, and numbers as 91 plus 10 digits", () => {
    expect(shortDate("2026-10-23")).toBe("Fri 23 Oct");
    expect(whatsappNumber("9876543210")).toBe("919876543210");
  });
});

describe("sendBookingMessage", () => {
  it("logs a sent row with the provider id, and a preview line without the name", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void logs.push(a.join(" ")));
    const row = await sendBookingMessage(booking, "confirmation", { store: memoryStore, env: {} });
    expect(row).toMatchObject({ bookingId: booking.id, kind: "confirmation", status: "sent", toMasked: "••••3210", template: "hello_world" });
    expect(row?.providerMessageId).toMatch(/^wamid\.fake-/);
    expect(logs.join("\n")).toContain("custom template would say: Hello [first name], your visit at Lotus Women's Clinic");
    expect(logs.join("\n")).not.toMatch(/Priya|9876543210/);
  });

  it("logs a failed row and does not throw when the send fails", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const sender = { kind: "cloud" as const, sendTemplate: vi.fn(async () => ({ ok: false, error: "131030: not allowed" })), sendText: vi.fn() };
    const row = await sendBookingMessage(booking, "reminder", { store: memoryStore, sender, env: {} });
    expect(row).toMatchObject({ status: "failed", error: "131030: not allowed", providerMessageId: null });
    expect(err.mock.calls.flat().join(" ")).not.toContain("9876543210");
  });

  it("sends the clinic alert to CLINIC_WHATSAPP, and skips with one line when it is unset", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void logs.push(a.join(" ")));
    expect(await sendBookingMessage(booking, "clinic_alert", { store: memoryStore, env: {} })).toBeNull();
    expect(logs).toEqual(["whatsapp clinic alert skipped: CLINIC_WHATSAPP not set"]);
    const row = await sendBookingMessage(booking, "clinic_alert", { store: memoryStore, env: { CLINIC_WHATSAPP: "911234567890" } });
    expect(row).toMatchObject({ kind: "clinic_alert", status: "sent", toMasked: "••••7890" });
    expect(logs).toContain("whatsapp (fake): template hello_world to ••••7890");
    expect(logs.join("\n")).not.toMatch(/Priya|Pregnancy|9876543210|1234567890/);
  });

  it("returns null and does not throw when the store fails", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { ...memoryStore, logMessage: vi.fn(async () => Promise.reject(new Error("relation \"messages\" does not exist"))) };
    expect(await sendBookingMessage(booking, "confirmation", { store: broken, env: {} })).toBeNull();
  });
});
