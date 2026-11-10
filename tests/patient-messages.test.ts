// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createStaff } from "@/app/api/admin/bookings/route";
import { PATCH } from "@/app/api/bookings/[id]/route";
import { GET as list, POST as book } from "@/app/api/bookings/route";
import { GET as viewVisit, POST as changeVisit } from "@/app/api/bookings/view/[token]/route";
import { GET as reminders } from "@/app/api/cron/reminders/route";
import { POST as inbound } from "@/app/api/whatsapp/twilio-inbound/route";
import { POST as twilioStatus } from "@/app/api/whatsapp/twilio-status/route";
import { POST as metaWebhook } from "@/app/api/whatsapp/webhook/route";
import { visitIcs } from "@/demos/lotus-clinic/visitCalendar";
import { ADMIN_COOKIE, signSession } from "@/lib/admin/auth";
import { CONSENT_TEXT_V1, STAFF_CONSENT_TEXT_V1 } from "@/lib/bookings/consent";
import { memoryStore, resetMemoryStore } from "@/lib/bookings/memory";
import { BOOKING_FLAG_DEFAULTS, type Booking, type NewBooking } from "@/lib/bookings/types";
import { isViewToken, newViewToken } from "@/lib/bookings/viewToken";
import { resetRateLimits } from "@/lib/rateLimit";
import { twilioSender } from "@/lib/whatsapp";
import { resetInboundReplies } from "@/lib/whatsapp/inbound";
import { buildMessage } from "@/lib/whatsapp/messages";
import { sendBookingMessage } from "@/lib/whatsapp/notify";
import { errorCode, isNoWhatsAppError, NO_WHATSAPP_CODES } from "@/lib/whatsapp/reachability";
import { requestReceivedText } from "@/lib/whatsapp/texts";
import { twilioContentSid } from "@/lib/whatsapp/twilio";
import { twilioSignature } from "@/lib/whatsapp/twilioStatus";

// Tuesday 20 Oct 2026, 10:00 in India. Tomorrow is Wednesday 21 Oct.
const NOW = new Date("2026-10-20T04:30:00Z");
const TODAY = "2026-10-20";
const TOMORROW = "2026-10-21";
const PUBLIC = "https://od-demo-lyart.vercel.app";
const TOKEN = "made-up-auth-token";
const consent = { at: "2026-10-19T04:30:00.000Z", text: CONSENT_TEXT_V1, source: "website" as const };

const base: NewBooking = {
  clinicSlug: "lotus-clinic",
  name: "Priya Sharma",
  phone: "9876543210",
  visitType: "clinic",
  date: "2026-10-22",
  slot: "Morning, 10 am – 1 pm",
  reason: "Pregnancy care",
  consent,
};

const booking: Booking = {
  id: "3f2a9c1e-0000-4000-8000-000000000000",
  createdAt: "2026-10-19T04:30:00.000Z",
  clinicSlug: "lotus-clinic",
  name: "Priya Sharma",
  phone: "9876543210",
  visitType: "clinic",
  date: "2026-10-24",
  slot: "Morning, 10 am – 1 pm",
  reason: "Pregnancy care",
  status: "confirmed",
  notes: "Front desk only",
  wantsNewTime: false,
  source: "website",
  campaign: null,
  utm: null,
  isDemo: false,
  ...BOOKING_FLAG_DEFAULTS,
  viewToken: "Xk3v9QmT0bLr2aWc8YpE5nHd",
  consentAt: consent.at,
  consentText: consent.text,
  consentSource: "website",
};

function req(url: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": "203.0.113.50", ...init.headers };
  return new NextRequest(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
}
const cookie = `${ADMIN_COOKIE}=${signSession("test-secret")}`;
const admin = (url: string, body: unknown, method = "PATCH") => req(url, { method, body, headers: { cookie } });
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const tokenCtx = (token: string) => ({ params: Promise.resolve({ token }) });
const messagesFor = (id: string) => memoryStore.listMessagesForBookings([id]);
const created = () => vi.fn(async () => new Response(JSON.stringify({ sid: "SM11111111111111111111111111111111", status: "queued" }), { status: 201 }));
const twilio = (fetchImpl: ReturnType<typeof created>) => twilioSender({ accountSid: "AC00000000000000000000000000000000", authToken: TOKEN, from: "+17372508034", fetchImpl });
const failing = (error: string) => ({ kind: "twilio" as const, sendTemplate: vi.fn(async () => ({ ok: false, error })), sendText: vi.fn() });
const logs: string[] = [];

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  resetMemoryStore();
  resetRateLimits();
  resetInboundReplies();
  logs.length = 0;
  for (const [k, v] of Object.entries({
    DATABASE_URL: "",
    ADMIN_PASSWORD: "open-sesame",
    ADMIN_SECRET: "test-secret",
    WHATSAPP_FAKE: "1",
    WHATSAPP_PUBLIC_URL: PUBLIC,
    CLINIC_WHATSAPP: "",
    RESEND_API_KEY: "",
    CRON_SECRET: "cron-secret",
    TWILIO_AUTH_TOKEN: "",
    WHATSAPP_APP_SECRET: "",
  })) {
    vi.stubEnv(k, v);
  }
  for (const level of ["log", "error", "warn", "info"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("message builders, one per kind", () => {
  it("request received: day and slot window, no buttons, the same words as the success screen", () => {
    const m = buildMessage("request_received", booking, { WHATSAPP_TEMPLATE_REQUEST_RECEIVED: "lotus_request_received" });
    expect(m.text).toBe("We've received your request for Sat 24 Oct, Morning, 10 am – 1 pm. The clinic will confirm on WhatsApp.");
    expect(m.preview).toBe(m.text);
    expect(requestReceivedText(booking)).toBe(m.text);
    expect(m.components).toEqual([{ type: "body", parameters: [{ type: "text", text: "Sat 24 Oct" }, { type: "text", text: "Morning, 10 am – 1 pm" }] }]);
  });

  it("visit confirmed: the window line and a View or change link, no quick replies", () => {
    const m = buildMessage("confirmation", booking, { WHATSAPP_PUBLIC_URL: "https://demo.example/" });
    expect(m.preview).toBe("Your visit at Lotus Women's Clinic is confirmed for Sat 24 Oct, Morning, 10 am – 1 pm. You can come any time in this window.");
    expect(m.text).toBe(`${m.preview}\nView or change: https://demo.example/clinic/website/v/Xk3v9QmT0bLr2aWc8YpE5nHd`);
    const meta = buildMessage("confirmation", booking, { WHATSAPP_TEMPLATE_CONFIRM: "lotus_visit_confirmed" });
    expect(meta.components.filter((c) => c.type === "button")).toEqual([
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "Xk3v9QmT0bLr2aWc8YpE5nHd" }] },
    ]);
  });

  it("reminder: see you tomorrow, the page link, and the STOP line, no buttons", () => {
    const m = buildMessage("reminder", booking, { WHATSAPP_TEMPLATE_REMINDER: "lotus_visit_reminder" });
    expect(m.text).toBe(`See you tomorrow, Sat 24 Oct, Morning, 10 am – 1 pm.\nView or change: ${PUBLIC}/clinic/website/v/Xk3v9QmT0bLr2aWc8YpE5nHd\nReply STOP to stop messages.`);
    expect(m.components.some((c) => c.type === "button")).toBe(false);
    expect(m.logPreview).toContain("[patient link]");
    expect(m.logPreview).not.toContain("Xk3v9QmT0bLr2aWc8YpE5nHd");
  });

  it("visit moved: the new day and slot, with Confirm and Change quick replies", () => {
    const m = buildMessage("visit_moved", { ...booking, date: "2026-10-26", slot: "Evening, 5 pm – 7 pm" }, { WHATSAPP_TEMPLATE_VISIT_MOVED: "lotus_visit_moved" });
    expect(m.preview).toBe("Your visit has moved to Mon 26 Oct, Evening, 5 pm – 7 pm.");
    expect(m.text).toBe("Your visit has moved to Mon 26 Oct, Evening, 5 pm – 7 pm.\nReply Confirm or Change.");
    expect(m.components.slice(1)).toEqual([
      { type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: "confirm" }] },
      { type: "button", sub_type: "quick_reply", index: "1", parameters: [{ type: "payload", payload: "change" }] },
    ]);
  });

  it("new kinds never borrow the confirmation's Twilio template; the reminder still does", () => {
    const env = { TWILIO_CONTENT_SID_CONFIRM: "HXconfirm" };
    expect(twilioContentSid("request_received", env)).toEqual({ reused: false });
    expect(twilioContentSid("visit_moved", env)).toEqual({ reused: false });
    expect(twilioContentSid("reminder", env)).toEqual({ sid: "HXconfirm", reused: true });
    expect(twilioContentSid("visit_moved", { ...env, TWILIO_CONTENT_SID_VISIT_MOVED: "HXmoved" })).toEqual({ sid: "HXmoved", reused: false });
    expect(twilioContentSid("request_received", { TWILIO_CONTENT_SID_REQUEST_RECEIVED: "HXreq" })).toEqual({ sid: "HXreq", reused: false });
  });
});

describe("patient link tokens", () => {
  it("are 24 url-safe characters and do not repeat", () => {
    const tokens = new Set(Array.from({ length: 200 }, newViewToken));
    expect(tokens.size).toBe(200);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(isViewToken("Xk3v9QmT0bLr2aWc8YpE5nHd")).toBe(true);
    expect(isViewToken("short")).toBe(false);
    expect(isViewToken("../../etc/passwd/aaaaaaaaaaaaaa")).toBe(false);
    expect(isViewToken(undefined)).toBe(false);
  });

  it("every new booking gets one", async () => {
    const a = await memoryStore.create(base);
    const b = await memoryStore.create(base);
    expect(isViewToken(a.viewToken)).toBe(true);
    expect(a.viewToken).not.toBe(b.viewToken);
    expect((await memoryStore.getByViewToken(a.viewToken!))?.id).toBe(a.id);
    expect(await memoryStore.getByViewToken("Nope0000000000000000000000")).toBeNull();
  });
});

describe("consent", () => {
  it("the website booking stores the exact line shown, and sends request received", async () => {
    const res = await book(req("/api/bookings", { method: "POST", body: { ...base, consent: true } }));
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const saved = (await memoryStore.get(id))!;
    expect(saved).toMatchObject({ consentSource: "website", consentText: CONSENT_TEXT_V1, consentAt: expect.stringMatching(/^2026-10-20T04:30/) });
    await vi.waitFor(async () => expect((await messagesFor(id)).map((m) => m.kind)).toEqual(["request_received"]));
    expect((await messagesFor(id))[0]).toMatchObject({ status: "sent", provider: "fake" });
  });

  it("a staff booking without the tick has no consent, and Confirm sends nothing to any provider", async () => {
    const fetchImpl = created();
    const res = await createStaff(admin("/api/admin/bookings", { name: "Walk In Wanda", phone: "98765 11111", date: TOMORROW, slot: base.slot, visitType: "clinic", reason: "PCOS", source: "walk_in" }, "POST"));
    const { booking: b } = await res.json();
    expect(b).toMatchObject({ consentSource: null, consentAt: null, consentText: null });
    const row = await sendBookingMessage(b, "confirmation", { store: memoryStore, sender: twilio(fetchImpl), env: {} });
    expect(row).toMatchObject({ template: "skipped (no consent)", status: "sent" });
    expect(fetchImpl).not.toHaveBeenCalled();
    await PATCH(admin(`/api/bookings/${b.id}`, { status: "confirmed" }), idCtx(b.id));
    expect(logs.join("\n")).toContain("skipped (no consent)");
  });

  it("a staff booking with Send on WhatsApp stores staff consent and gets the confirmation", async () => {
    const res = await createStaff(
      admin("/api/admin/bookings", { name: "Phone Padma", phone: "98765 22222", date: TOMORROW, slot: base.slot, visitType: "clinic", reason: "PCOS", source: "phone", sendWhatsApp: true }, "POST"),
    );
    const { booking: b } = await res.json();
    expect(b).toMatchObject({ consentSource: "staff", consentText: STAFF_CONSENT_TEXT_V1, consentAt: expect.stringMatching(/^2026-10-20T04:30/) });
    await vi.waitFor(async () => expect((await messagesFor(b.id)).map((m) => [m.kind, m.template])).toEqual([["confirmation", "hello_world"]]));
  });
});

describe("staff change the day or slot", () => {
  it("sends visit moved and waits for the patient", async () => {
    const b = await memoryStore.create(base);
    await memoryStore.updateStatus(b.id, "confirmed");
    const res = await PATCH(admin(`/api/bookings/${b.id}`, { date: "2026-10-23", slot: "Evening, 5 pm – 7 pm" }), idCtx(b.id));
    expect((await res.json()).booking).toMatchObject({ date: "2026-10-23", slot: "Evening, 5 pm – 7 pm", status: "confirmed", awaitingPatient: true });
    await vi.waitFor(async () => expect((await messagesFor(b.id)).map((m) => m.kind)).toEqual(["visit_moved"]));
    const live = await (await list(req("/api/bookings", { headers: { cookie } }))).json();
    expect(live.bookings.find((x: Booking) => x.id === b.id)).toMatchObject({ awaitingPatient: true, whatsapp: { kind: "visit_moved" } });
  });

  it("does not wait when the patient cannot be reached (no consent), and refuses a cancelled booking", async () => {
    const b = await memoryStore.create({ ...base, consent: null });
    const res = await PATCH(admin(`/api/bookings/${b.id}`, { date: "2026-10-23", slot: "Evening, 5 pm – 7 pm" }), idCtx(b.id));
    expect((await res.json()).booking.awaitingPatient).toBe(false);
    await vi.waitFor(async () => expect((await messagesFor(b.id))[0]?.template).toBe("skipped (no consent)"));
    await memoryStore.updateStatus(b.id, "cancelled");
    expect((await PATCH(admin(`/api/bookings/${b.id}`, { date: "2026-10-24", slot: base.slot }), idCtx(b.id))).status).toBe(400);
  });
});

describe("STOP and START", () => {
  const signed = (fields: Record<string, string>) => {
    const params = new URLSearchParams({ From: "whatsapp:+919876543210", To: "whatsapp:+17372508034", ...fields });
    return inbound(
      new NextRequest("http://localhost:3000/api/whatsapp/twilio-inbound", {
        method: "POST",
        body: params.toString(),
        headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": twilioSignature(TOKEN, `${PUBLIC}/api/whatsapp/twilio-inbound`, params) },
      }),
    );
  };

  beforeEach(() => vi.stubEnv("TWILIO_AUTH_TOKEN", TOKEN));

  it("STOP opts the number out and replies once; every later send is skipped; START turns it back on", async () => {
    const b = await memoryStore.create(base);
    const first = await (await signed({ Body: "STOP" })).text();
    expect(first).toContain("<Message>You won&apos;t get more WhatsApp messages from Lotus Women&apos;s Clinic. Reply START to turn them back on.</Message>");
    expect(await (await signed({ Body: "stop" })).text()).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    expect((await memoryStore.whatsappBlocks(["9876543210"])).optedOut).toEqual(["9876543210"]);

    const fetchImpl = created();
    const row = await sendBookingMessage(b, "reminder", { store: memoryStore, sender: twilio(fetchImpl), env: {} });
    expect(row).toMatchObject({ template: "skipped (opted out)", status: "sent" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logs).toContain(`whatsapp: reminder for booking ${b.id.replace(/-/g, "").slice(0, 8).toUpperCase()} skipped (opted out)`);
    // No polite auto-reply to an opted-out number either.
    expect(await (await signed({ Body: "hello?" })).text()).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

    const live = await (await list(req("/api/bookings", { headers: { cookie } }))).json();
    expect(live.bookings.find((x: Booking) => x.id === b.id)).toMatchObject({ optedOut: true, whatsapp: { skipped: true, skipReason: "opted out" } });

    expect(await (await signed({ Body: "START" })).text()).toContain("again. Reply STOP to stop them.");
    expect((await memoryStore.whatsappBlocks(["9876543210"])).optedOut).toEqual([]);
    expect((await sendBookingMessage(b, "reminder", { store: memoryStore, sender: twilio(fetchImpl), env: {} }))?.template).toBe("text");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("Twilio's other opt-out words work too, even with no booking", async () => {
    expect(await (await signed({ Body: "Unsubscribe" })).text()).toContain("Reply START");
    expect((await memoryStore.whatsappBlocks(["9876543210"])).optedOut).toEqual(["9876543210"]);
  });
});

describe("No WhatsApp", () => {
  it("maps the documented codes only", () => {
    expect(NO_WHATSAPP_CODES).toEqual({ meta: ["131026"], twilio: ["63024", "63003"] });
    expect(isNoWhatsAppError("twilio", "63024: Invalid message recipient")).toBe(true);
    expect(isNoWhatsAppError("twilio", "63003")).toBe(true);
    expect(isNoWhatsAppError("meta", 131026)).toBe(true);
    expect(isNoWhatsAppError("meta", "131026: Message undeliverable")).toBe(true);
    for (const other of ["63016: outside session", "21654: ContentSid Required", "63015", "131030: not allowed"]) {
      expect(isNoWhatsAppError("twilio", other)).toBe(false);
      expect(isNoWhatsAppError("meta", other)).toBe(false);
    }
    expect(isNoWhatsAppError("meta", "63024")).toBe(false);
    expect(isNoWhatsAppError("fake", "63024")).toBe(false);
    expect(errorCode("63024: Invalid message recipient")).toBe("63024");
  });

  it("a send that fails with 63024 marks the booking and the phone; the next booking skips WhatsApp", async () => {
    const b = await memoryStore.create(base);
    const row = await sendBookingMessage(b, "confirmation", { store: memoryStore, sender: failing("63024: Invalid message recipient"), env: {} });
    expect(row).toMatchObject({ status: "failed" });
    expect((await memoryStore.get(b.id))?.noWhatsApp).toBe(true);
    expect((await memoryStore.whatsappBlocks(["9876543210"])).unreachable).toEqual(["9876543210"]);

    const later = await memoryStore.create({ ...base, date: "2026-10-27" });
    const fetchImpl = created();
    const next = await sendBookingMessage(later, "request_received", { store: memoryStore, sender: twilio(fetchImpl), env: {} });
    expect(next?.template).toBe("skipped (no WhatsApp)");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect((await memoryStore.get(later.id))?.noWhatsApp).toBe(true);
  });

  it("other failures and a failed clinic alert mark nothing", async () => {
    const b = await memoryStore.create(base);
    await sendBookingMessage(b, "confirmation", { store: memoryStore, sender: failing("63016: outside the session"), env: {} });
    await sendBookingMessage(b, "clinic_alert", { store: memoryStore, sender: failing("63024: Invalid message recipient"), env: { CLINIC_WHATSAPP: "919000000001" } });
    expect((await memoryStore.get(b.id))?.noWhatsApp).toBe(false);
    expect((await memoryStore.whatsappBlocks(["9876543210"])).unreachable).toEqual([]);
  });

  it("a Twilio status callback with 63024 marks the booking; it shows in Needs action", async () => {
    const b = await memoryStore.create({ ...base, date: TOMORROW });
    await memoryStore.updateStatus(b.id, "confirmed");
    await memoryStore.logMessage({ bookingId: b.id, kind: "confirmation", provider: "twilio", toMasked: "••••3210", template: "HX1", status: "sent", providerMessageId: "SMabc" });
    const res = await twilioStatus(req("/api/whatsapp/twilio-status", { method: "POST", body: "MessageSid=SMabc&MessageStatus=undelivered&ErrorCode=63024&ErrorMessage=Invalid+message+recipient", headers: { "content-type": "application/x-www-form-urlencoded" } }));
    expect(res.status).toBe(200);
    expect((await memoryStore.get(b.id))?.noWhatsApp).toBe(true);
    const live = await (await list(req("/api/bookings", { headers: { cookie } }))).json();
    expect(live.needsAction.map((x: Booking) => x.id)).toContain(b.id);
    expect(logs.join("\n")).not.toContain("9876543210");

    // Confirmed by phone: confirmed, stamped, nothing sent, and it leaves Needs action.
    const before = (await messagesFor(b.id)).length;
    const done = await (await PATCH(admin(`/api/bookings/${b.id}`, { status: "confirmed", byPhone: true }), idCtx(b.id))).json();
    expect(done.booking).toMatchObject({ status: "confirmed", noWhatsApp: true, phoneConfirmedAt: expect.stringMatching(/^2026-10-20T04:30/), consentSource: "website" });
    await new Promise((r) => setTimeout(r, 20));
    expect(await messagesFor(b.id)).toHaveLength(before);
    const after = await (await list(req("/api/bookings", { headers: { cookie } }))).json();
    expect(after.needsAction.map((x: Booking) => x.id)).not.toContain(b.id);
  });

  it("a Meta status with 131026 marks the booking too", async () => {
    const b = await memoryStore.create(base);
    await memoryStore.logMessage({ bookingId: b.id, kind: "confirmation", toMasked: "••••3210", template: "lotus_visit_confirmed", status: "sent", providerMessageId: "wamid.Z" });
    const body = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid.Z", status: "failed", errors: [{ code: 131026, title: "Message undeliverable" }] }] } }] }] });
    expect((await metaWebhook(req("/api/whatsapp/webhook", { method: "POST", body }))).status).toBe(200);
    expect((await memoryStore.get(b.id))?.noWhatsApp).toBe(true);
  });
});

describe("reminder cron", () => {
  const run = () => reminders(req("/api/cron/reminders", { headers: { authorization: "Bearer cron-secret" } }));

  it("skips No-WhatsApp bookings without a row, records opted-out ones as skipped, and sends the link and the STOP line", async () => {
    vi.stubEnv("WHATSAPP_FAKE", "");
    vi.stubEnv("WHATSAPP_PROVIDER", "twilio");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC00000000000000000000000000000000");
    vi.stubEnv("TWILIO_AUTH_TOKEN", TOKEN);
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "+17372508034");
    vi.stubEnv("NODE_ENV", "test");
    const fetchImpl = created();
    vi.stubGlobal("fetch", fetchImpl);
    const ok = await memoryStore.create({ ...base, date: TOMORROW });
    const noWa = await memoryStore.create({ ...base, date: TOMORROW, phone: "9123456789" });
    const stopped = await memoryStore.create({ ...base, date: TOMORROW, phone: "9234567890" });
    for (const b of [ok, noWa, stopped]) await memoryStore.updateStatus(b.id, "confirmed");
    await memoryStore.setNoWhatsApp(noWa.id, true);
    await memoryStore.optOut("9234567890", "whatsapp");

    expect(await (await run()).json()).toEqual({ ok: true, date: TOMORROW, due: 2, sent: 1, failed: 0, skipped: 0, blocked: 1, noWhatsApp: 1 });
    expect(await messagesFor(noWa.id)).toEqual([]);
    expect((await messagesFor(stopped.id))[0]).toMatchObject({ kind: "reminder", template: "skipped (opted out)" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = new URLSearchParams(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body)).get("Body");
    expect(body).toBe(`See you tomorrow, Wed 21 Oct, Morning, 10 am – 1 pm.\nView or change: ${PUBLIC}/clinic/website/v/${ok.viewToken}\nReply STOP to stop messages.`);
    // Run again: nobody is reminded twice.
    expect(await (await run()).json()).toMatchObject({ sent: 0, skipped: 2, blocked: 0 });
  });
});

describe("the patient page API", () => {
  const get = (token: string, ip = "203.0.113.60") => viewVisit(req(`/api/bookings/view/${token}`, { headers: { "x-forwarded-for": ip } }), tokenCtx(token));
  const post = (token: string, body: unknown) => changeVisit(req(`/api/bookings/view/${token}`, { method: "POST", body }), tokenCtx(token));

  it("shows the visit and nothing personal", async () => {
    const b = await memoryStore.create({ ...base, notes: "Secret desk note" });
    const res = await get(b.viewToken!);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      ok: true,
      today: TODAY,
      visit: { date: "2026-10-22", slot: "Morning, 10 am – 1 pm", visitType: "clinic", status: "new", wantsNewTime: false, requestedDate: null, requestedSlot: null, awaitingPatient: false },
    });
    const text = JSON.stringify(data);
    for (const secret of ["Priya", "9876543210", "Pregnancy care", "Secret desk note", b.id, b.viewToken!, "consent"]) expect(text).not.toContain(secret);
  });

  it("answers 404 to an unknown or malformed token, and 410 after the visit day", async () => {
    expect((await get("Unknown00000000000000000")).status).toBe(404);
    expect((await get("bad")).status).toBe(404);
    const past = await memoryStore.create({ ...base, date: "2026-10-19" });
    const res = await get(past.viewToken!);
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ ok: false, expired: true });
    expect((await post(past.viewToken!, { action: "cancel" })).status).toBe(410);
    expect((await memoryStore.get(past.id))?.status).toBe("new");
    // The visit day itself still works.
    const today = await memoryStore.create({ ...base, date: TODAY });
    expect((await get(today.viewToken!)).status).toBe(200);
  });

  it("asks for another day or slot: the dashboard shows Wants a new time with the requested slot", async () => {
    const b = await memoryStore.create(base);
    await memoryStore.reschedule(b.id, b.date, b.slot, { awaitingPatient: true });
    const res = await post(b.viewToken!, { action: "change", date: "2026-10-26", slot: "Evening, 5 pm – 7 pm" });
    expect(res.status).toBe(200);
    expect((await res.json()).visit).toMatchObject({ wantsNewTime: true, requestedDate: "2026-10-26", requestedSlot: "Evening, 5 pm – 7 pm", awaitingPatient: false, date: "2026-10-22" });
    const live = await (await list(req("/api/bookings", { headers: { cookie } }))).json();
    expect(live.needsAction.find((x: Booking) => x.id === b.id)).toMatchObject({ wantsNewTime: true, requestedDate: "2026-10-26", requestedSlot: "Evening, 5 pm – 7 pm" });
    // Staff moving it answers the request.
    const moved = await (await PATCH(admin(`/api/bookings/${b.id}`, { date: "2026-10-26", slot: "Evening, 5 pm – 7 pm" }), idCtx(b.id))).json();
    expect(moved.booking).toMatchObject({ wantsNewTime: false, requestedDate: null, requestedSlot: null, awaitingPatient: true });
  });

  it("refuses a past day, a Sunday clinic visit, a day past the booking window and an unknown slot", async () => {
    const b = await memoryStore.create(base);
    for (const body of [
      { action: "change", date: "2026-10-19", slot: base.slot },
      { action: "change", date: "2026-10-25", slot: base.slot },
      { action: "change", date: "2027-01-30", slot: base.slot },
      { action: "change", date: "2026-10-23", slot: "Midnight" },
      { action: "nope" },
    ]) {
      expect((await post(b.viewToken!, body)).status).toBe(400);
    }
    expect((await memoryStore.get(b.id))?.wantsNewTime).toBe(false);
  });

  it("cancels the visit, and then refuses further changes", async () => {
    const b = await memoryStore.create(base);
    const res = await post(b.viewToken!, { action: "cancel" });
    expect((await res.json()).visit.status).toBe("cancelled");
    expect((await memoryStore.get(b.id))?.status).toBe("cancelled");
    expect((await post(b.viewToken!, { action: "change", date: "2026-10-23", slot: base.slot })).status).toBe(409);
  });

  it("is rate limited per IP", async () => {
    const b = await memoryStore.create(base);
    const statuses: number[] = [];
    for (let i = 0; i < 32; i++) statuses.push((await get(b.viewToken!, "198.51.100.7")).status);
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(30)).toEqual([429, 429]);
    expect((await get(b.viewToken!, "198.51.100.8")).status).toBe(200);
  });
});

describe("add to calendar", () => {
  it("builds a one-event .ics in clinic time with the address, and nothing personal", () => {
    const ics = visitIcs({ date: "2026-10-22", slot: "Afternoon, 2 pm – 5 pm", visitType: "clinic" }, new Date("2026-10-20T04:30:00Z"));
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    // 2 pm to 5 pm in India is 08:30 to 11:30 UTC.
    expect(ics).toContain("DTSTART:20261022T083000Z\r\n");
    expect(ics).toContain("DTEND:20261022T113000Z\r\n");
    expect(ics).toContain("LOCATION:Door 9-12-4\\, 2nd floor\\, Beach Road\\, Siripuram\\, Visakhapatnam 530003");
    expect(ics).toContain("SUMMARY:Visit\\, Lotus Women's Clinic");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    const online = visitIcs({ date: "2026-10-25", slot: "Morning, 10 am – 1 pm", visitType: "online" });
    expect(online).toContain("DTSTART:20261025T043000Z");
    expect(online).not.toContain("LOCATION");
  });
});

describe("wording", () => {
  const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

  it("prescriptions and reports are sent as a secure link, never claimed over WhatsApp", () => {
    for (const file of ["demos/lotus-clinic/data.ts", "content/industries.ts"]) {
      const text = read(file);
      expect(text).not.toMatch(/Prescription on WhatsApp/i);
      expect(text).not.toMatch(/prescriptions?[^."\n]*on WhatsApp/i);
      expect(text).not.toMatch(/reports? (sent )?to the patient on WhatsApp/i);
      expect(text).not.toMatch(/own copy on WhatsApp/i);
    }
    expect(read("demos/lotus-clinic/data.ts")).toContain("Prescription sent as a secure link");
    expect(read("content/industries.ts")).toContain("Reports sent to the patient as a secure link.");
  });
});
