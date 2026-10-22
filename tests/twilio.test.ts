// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as twilioStatus } from "@/app/api/whatsapp/twilio-status/route";
import { memoryStore, resetMemoryStore } from "@/lib/bookings/memory";
import type { Booking } from "@/lib/bookings/types";
import { getWhatsApp, isConfigured, providerName, providerProblem } from "@/lib/whatsapp";
import { sendBookingMessage } from "@/lib/whatsapp/notify";
import { buildMessage, CONTENT_VARIABLES, contentVariablesFor } from "@/lib/whatsapp/messages";
import { twilioAddress, twilioContentSid, twilioSender, twilioStatusUrl, withContentHint } from "@/lib/whatsapp/twilio";
import { mapTwilioStatus, twilioSignature, twilioStatusError, validTwilioSignature } from "@/lib/whatsapp/twilioStatus";

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
  wantsNewTime: false,
};

const SID = "AC00000000000000000000000000000000";
const TOKEN = "made-up-auth-token";
const created = () =>
  vi.fn(async () => new Response(JSON.stringify({ sid: "SM11111111111111111111111111111111", status: "queued" }), { status: 201 }));
const call = (f: ReturnType<typeof vi.fn>, i = 0) => f.mock.calls[i] as unknown as [string, RequestInit];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetMemoryStore();
});

describe("twilio sender", () => {
  it("posts form fields to the Messages endpoint with basic auth and a status callback", async () => {
    const fetchImpl = created();
    const sender = twilioSender({ accountSid: SID, authToken: TOKEN, from: "+14155238886", publicUrl: "https://od-demo-lyart.vercel.app/", fetchImpl });
    const res = await sender.sendText({ to: "919876543210", body: "Hello Priya" });
    expect(res).toEqual({ ok: true, messageId: "SM11111111111111111111111111111111" });
    const [url, init] = call(fetchImpl);
    expect(url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`);
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from(`${SID}:${TOKEN}`).toString("base64")}`);
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({
      From: "whatsapp:+14155238886",
      To: "whatsapp:+919876543210",
      Body: "Hello Priya",
      StatusCallback: "https://od-demo-lyart.vercel.app/api/whatsapp/twilio-status",
    });
  });

  it("leaves out StatusCallback without a public URL, and sendTemplate sends the plain text", async () => {
    const fetchImpl = created();
    const sender = twilioSender({ accountSid: SID, authToken: TOKEN, from: "whatsapp:+14155238886", fetchImpl });
    expect(sender.kind).toBe("twilio");
    await sender.sendTemplate({ to: "919876543210", template: "hello_world", components: [], text: "Hello Priya, your visit is confirmed." });
    const form = new URLSearchParams(String(call(fetchImpl)[1].body));
    expect(form.get("Body")).toBe("Hello Priya, your visit is confirmed.");
    expect(form.get("From")).toBe("whatsapp:+14155238886");
    expect(form.has("StatusCallback")).toBe(false);
  });

  it("refuses a template with no text, without calling Twilio", async () => {
    const fetchImpl = created();
    const res = await twilioSender({ accountSid: SID, authToken: TOKEN, from: "+14155238886", fetchImpl }).sendTemplate({ to: "919876543210", template: "hello_world" });
    expect(res.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("turns Twilio errors and network failures into a short reason with no numbers, never throwing", async () => {
    const bad = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 63015, message: "Channel Sandbox can only send messages to phone numbers that have joined the Sandbox: whatsapp:+919876543210", status: 400 }), { status: 400 }),
    );
    const res = await twilioSender({ accountSid: SID, authToken: TOKEN, from: "+14155238886", fetchImpl: bad }).sendText({ to: "919876543210", body: "x" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/^63015: Channel Sandbox can only send/);
    expect(res.error).not.toContain("9876543210");
    expect(res.error!.length).toBeLessThanOrEqual(160);
    const down = vi.fn(async () => Promise.reject(new TypeError("fetch failed")));
    const net = await twilioSender({ accountSid: SID, authToken: TOKEN, from: "+14155238886", fetchImpl: down }).sendText({ to: "919876543210", body: "x" });
    expect(net).toEqual({ ok: false, error: "TypeError: request did not complete" });
    const noSid = vi.fn(async () => new Response("{}", { status: 201 }));
    expect((await twilioSender({ accountSid: SID, authToken: TOKEN, from: "+14155238886", fetchImpl: noSid }).sendText({ to: "91", body: "x" })).ok).toBe(false);
  });

  it("formats addresses and the callback URL", () => {
    expect(twilioAddress("+1 415 523 8886")).toBe("whatsapp:+14155238886");
    expect(twilioAddress("whatsapp:+14155238886")).toBe("whatsapp:+14155238886");
    expect(twilioStatusUrl("https://x.test//")).toBe("https://x.test/api/whatsapp/twilio-status");
  });
});

describe("provider selection", () => {
  const twilio = { TWILIO_ACCOUNT_SID: SID, TWILIO_AUTH_TOKEN: TOKEN, TWILIO_WHATSAPP_FROM: "+14155238886" };
  const meta = { WHATSAPP_TOKEN: "meta-token" };

  it.each([
    ["nothing set", {}, "fake"],
    ["only Meta", meta, "meta"],
    ["only Twilio", twilio, "twilio"],
    ["both, unset provider prefers Twilio", { ...meta, ...twilio }, "twilio"],
    ["Twilio missing one var", { ...meta, TWILIO_ACCOUNT_SID: SID, TWILIO_AUTH_TOKEN: TOKEN }, "meta"],
    ["provider=meta with both", { ...meta, ...twilio, WHATSAPP_PROVIDER: "meta" }, "meta"],
    ["provider=twilio with both", { ...meta, ...twilio, WHATSAPP_PROVIDER: "twilio" }, "twilio"],
    ["provider=Twilio, any case", { ...twilio, WHATSAPP_PROVIDER: " Twilio " }, "twilio"],
    ["provider=fake with both", { ...meta, ...twilio, WHATSAPP_PROVIDER: "fake" }, "fake"],
    ["provider=twilio without its vars", { ...meta, WHATSAPP_PROVIDER: "twilio" }, "fake"],
    ["provider=meta without a token", { ...twilio, WHATSAPP_PROVIDER: "meta" }, "fake"],
    ["unknown provider falls back to auto", { ...meta, WHATSAPP_PROVIDER: "twillio" }, "meta"],
    ["WHATSAPP_FAKE=1 beats everything", { ...meta, ...twilio, WHATSAPP_PROVIDER: "twilio", WHATSAPP_FAKE: "1" }, "fake"],
  ])("%s -> %s", (_, env, want) => {
    expect(providerName(env)).toBe(want);
    expect(isConfigured(env)).toBe(want !== "fake");
    expect(getWhatsApp(env).kind).toBe({ meta: "cloud", twilio: "twilio", fake: "fake" }[want]);
  });

  it("explains a named provider that is missing its vars, without naming any value", () => {
    expect(providerProblem({ WHATSAPP_PROVIDER: "twilio" })).toMatch(/TWILIO_ACCOUNT_SID/);
    expect(providerProblem({ WHATSAPP_PROVIDER: "meta" })).toMatch(/WHATSAPP_TOKEN is not set/);
    expect(providerProblem({ ...twilio })).toBeNull();
    expect(providerProblem({ WHATSAPP_PROVIDER: "twilio", WHATSAPP_FAKE: "1" })).toBeNull();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    getWhatsApp({ ...meta, WHATSAPP_PROVIDER: "twilio" });
    expect(warn.mock.calls.flat().join(" ")).toContain("using the fake sender");
    expect(warn.mock.calls.flat().join(" ")).not.toContain("meta-token");
  });

  it("uses TWILIO_API_BASE outside production only", async () => {
    const fetchImpl = created();
    const env = { ...twilio, TWILIO_API_BASE: "http://127.0.0.1:9999" };
    await getWhatsApp(env, fetchImpl).sendText({ to: "919876543210", body: "x" });
    await getWhatsApp({ ...env, NODE_ENV: "production" }, fetchImpl).sendText({ to: "919876543210", body: "x" });
    expect(call(fetchImpl, 0)[0]).toBe(`http://127.0.0.1:9999/2010-04-01/Accounts/${SID}/Messages.json`);
    expect(call(fetchImpl, 1)[0]).toBe(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`);
  });
});

describe("sendBookingMessage via Twilio", () => {
  it("sends the filled plain text and logs provider twilio, template text and the SM sid", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void logs.push(a.join(" ")));
    const fetchImpl = created();
    const sender = twilioSender({ accountSid: SID, authToken: TOKEN, from: "+14155238886", fetchImpl });
    const row = await sendBookingMessage(booking, "confirmation", { store: memoryStore, sender, env: {} });
    expect(row).toMatchObject({
      kind: "confirmation",
      provider: "twilio",
      template: "text",
      status: "sent",
      toMasked: "••••3210",
      providerMessageId: "SM11111111111111111111111111111111",
    });
    const form = new URLSearchParams(String(call(fetchImpl)[1].body));
    expect(form.get("Body")).toBe(
      "Hello Priya, your visit at Lotus Women's Clinic is confirmed for Sat 24 Oct, Morning, 10 am – 1 pm. Visit type: Clinic visit. Reply to this message if you need to change it.",
    );
    expect(logs.join("\n")).toContain("sent as text via twilio (no TWILIO_CONTENT_SID_CONFIRM): Hello [first name], your visit");
    expect(logs.join("\n")).not.toMatch(/Priya|9876543210|hello_world/);
  });

  it("logs the provider on a failed send too", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ code: 20003, message: "Authenticate" }), { status: 401 }));
    const sender = twilioSender({ accountSid: SID, authToken: TOKEN, from: "+14155238886", fetchImpl });
    const row = await sendBookingMessage(booking, "reminder", { store: memoryStore, sender, env: {} });
    expect(row).toMatchObject({ provider: "twilio", status: "failed", error: "20003: Authenticate", providerMessageId: null });
    expect(err.mock.calls.flat().join(" ")).toContain("via twilio");
    expect(err.mock.calls.flat().join(" ")).not.toContain(TOKEN);
  });

  it("logs provider fake and meta for the other senders", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect((await sendBookingMessage(booking, "confirmation", { store: memoryStore, env: {} }))?.provider).toBe("fake");
    const meta = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.M" }] }), { status: 200 }));
    const sender = getWhatsApp({ WHATSAPP_TOKEN: "t" }, meta);
    expect(await sendBookingMessage(booking, "reminder", { store: memoryStore, sender, env: {} })).toMatchObject({ provider: "meta", template: "hello_world" });
  });
});

describe("twilio content templates", () => {
  const HX = "HX00000000000000000000000000000001";

  it("sends ContentSid and ContentVariables as a JSON string, and no Body", async () => {
    const fetchImpl = created();
    const sender = twilioSender({ accountSid: SID, authToken: TOKEN, from: "+17372508034", fetchImpl });
    const res = await sender.sendTemplate({ to: "919876543210", template: "hello_world", text: "fallback words", contentSid: HX, contentVariables: { "1": "Sat 24 Oct", "2": "Morning" } });
    expect(res.ok).toBe(true);
    const form = Object.fromEntries(new URLSearchParams(String(call(fetchImpl)[1].body)));
    expect(form).toEqual({ From: "whatsapp:+17372508034", To: "whatsapp:+919876543210", ContentSid: HX, ContentVariables: '{"1":"Sat 24 Oct","2":"Morning"}' });
    expect(JSON.parse(form.ContentVariables)).toEqual({ "1": "Sat 24 Oct", "2": "Morning" });
  });

  it("leaves out ContentVariables when there are none, and falls back to Body without a sid", async () => {
    const fetchImpl = created();
    const sender = twilioSender({ accountSid: SID, authToken: TOKEN, from: "+17372508034", fetchImpl });
    await sender.sendTemplate({ to: "919876543210", template: "hello_world", contentSid: HX, contentVariables: {} });
    await sender.sendTemplate({ to: "919876543210", template: "hello_world", text: "Hello Priya" });
    const first = new URLSearchParams(String(call(fetchImpl, 0)[1].body));
    expect(first.get("ContentSid")).toBe(HX);
    expect(first.has("ContentVariables")).toBe(false);
    expect(first.has("Body")).toBe(false);
    const second = new URLSearchParams(String(call(fetchImpl, 1)[1].body));
    expect(second.get("Body")).toBe("Hello Priya");
    expect(second.has("ContentSid")).toBe(false);
  });

  it("picks the sid per kind and reuses CONFIRM for the others when theirs is unset", () => {
    expect(twilioContentSid("confirmation", {})).toEqual({ reused: false });
    expect(twilioContentSid("reminder", {})).toEqual({ reused: false });
    const one = { TWILIO_CONTENT_SID_CONFIRM: HX };
    expect(twilioContentSid("confirmation", one)).toEqual({ sid: HX, reused: false });
    expect(twilioContentSid("reminder", one)).toEqual({ sid: HX, reused: true });
    expect(twilioContentSid("clinic_alert", one)).toEqual({ sid: HX, reused: true });
    const all = { ...one, TWILIO_CONTENT_SID_REMINDER: "HXrem", TWILIO_CONTENT_SID_CLINIC_ALERT: "HXalert" };
    expect(twilioContentSid("reminder", all)).toEqual({ sid: "HXrem", reused: false });
    expect(twilioContentSid("clinic_alert", all)).toEqual({ sid: "HXalert", reused: false });
    // Reminder set without CONFIRM: confirmation still has none.
    expect(twilioContentSid("confirmation", { TWILIO_CONTENT_SID_REMINDER: "HXrem" })).toEqual({ reused: false });
  });

  it("builds the variable map per kind", () => {
    expect(CONTENT_VARIABLES).toEqual({ confirmation: ["date", "slot"], reminder: ["date", "slot"], clinic_alert: ["firstNameAndVisit", "dateAndSlot"] });
    expect(contentVariablesFor("confirmation", booking)).toEqual({ "1": "Sat 24 Oct", "2": "Morning, 10 am – 1 pm" });
    expect(contentVariablesFor("reminder", booking)).toEqual({ "1": "Sat 24 Oct", "2": "Morning, 10 am – 1 pm" });
    expect(contentVariablesFor("clinic_alert", booking)).toEqual({ "1": "Priya (Clinic visit)", "2": "Sat 24 Oct, Morning, 10 am – 1 pm" });
    expect(contentVariablesFor("clinic_alert", booking, true)).toEqual({ "1": "[first name] (Clinic visit)", "2": "Sat 24 Oct, Morning, 10 am – 1 pm" });
    const online = buildMessage("clinic_alert", { ...booking, visitType: "online", date: "2026-10-22" }, { TWILIO_CONTENT_SID_CONFIRM: HX });
    expect(online).toMatchObject({ contentSid: HX, contentSidReused: true, contentVariables: { "1": "Priya (Online consultation)", "2": "Thu 22 Oct, Morning, 10 am – 1 pm" } });
    expect(buildMessage("confirmation", booking, {})).toMatchObject({ contentSid: undefined, contentSidReused: false });
  });

  it("adds the content hint to 21654 and 63016 only, within 160 chars", async () => {
    expect(withContentHint(21654, "21654: ContentSid Required")).toBe("21654: ContentSid Required (set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet)");
    expect(withContentHint("63016", "63016: x")).toBe("63016: x (set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet)");
    expect(withContentHint(20003, "20003: Authenticate")).toBe("20003: Authenticate");
    expect(withContentHint(null, "x")).toBe("x");
    const long = withContentHint(21654, `21654: ${"a".repeat(300)}`);
    expect(long.length).toBe(160);
    expect(long.endsWith("(set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet)")).toBe(true);
    const bad = vi.fn(async () => new Response(JSON.stringify({ code: 21654, message: "ContentSid Required", status: 400 }), { status: 400 }));
    const res = await twilioSender({ accountSid: SID, authToken: TOKEN, from: "+17372508034", fetchImpl: bad }).sendText({ to: "919876543210", body: "x" });
    expect(res).toEqual({ ok: false, error: "21654: ContentSid Required (set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet)" });
  });

  it("sendBookingMessage sends the content template, logs the HX sid as template, and logs no names", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void logs.push(a.join(" ")));
    const fetchImpl = created();
    const sender = twilioSender({ accountSid: SID, authToken: TOKEN, from: "+17372508034", fetchImpl });
    const env = { TWILIO_CONTENT_SID_CONFIRM: HX, CLINIC_WHATSAPP: "919000000001" };
    const row = await sendBookingMessage(booking, "confirmation", { store: memoryStore, sender, env });
    expect(row).toMatchObject({ provider: "twilio", template: HX, status: "sent", providerMessageId: "SM11111111111111111111111111111111" });
    const form = new URLSearchParams(String(call(fetchImpl)[1].body));
    expect(form.get("ContentSid")).toBe(HX);
    expect(JSON.parse(form.get("ContentVariables")!)).toEqual({ "1": "Sat 24 Oct", "2": "Morning, 10 am – 1 pm" });
    expect(form.has("Body")).toBe(false);

    const alert = await sendBookingMessage(booking, "clinic_alert", { store: memoryStore, sender, env });
    expect(alert).toMatchObject({ template: HX, toMasked: "••••0001" });
    expect(JSON.parse(new URLSearchParams(String(call(fetchImpl, 1)[1].body)).get("ContentVariables")!)).toEqual({ "1": "Priya (Clinic visit)", "2": "Sat 24 Oct, Morning, 10 am – 1 pm" });
    const all = logs.join("\n");
    expect(all).toContain(`confirmation for booking 3F2A9C1E sent as content ${HX} via twilio`);
    expect(all).toContain("TWILIO_CONTENT_SID_CLINIC_ALERT not set; clinic_alert reuses TWILIO_CONTENT_SID_CONFIRM");
    expect(all).toContain('"1":"[first name] (Clinic visit)"');
    expect(all).not.toMatch(/Priya|9876543210|9000000001/);
  });

  it("logs a failed content send with the hint for the dashboard", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ code: 63016, message: "Failed to send freeform message because you are outside the allowed window" }), { status: 400 }));
    const sender = twilioSender({ accountSid: SID, authToken: TOKEN, from: "+17372508034", fetchImpl });
    const row = await sendBookingMessage(booking, "reminder", { store: memoryStore, sender, env: {} });
    expect(row).toMatchObject({ status: "failed", template: "text" });
    expect(row!.error).toMatch(/^63016: .*\(set TWILIO_CONTENT_SID_\*, or patient has not joined on WhatsApp yet\)$/);
  });
});

describe("twilio signature", () => {
  it("matches Twilio's published example", () => {
    // From Twilio's webhook security docs and twilio-node's tests.
    const params = new URLSearchParams({ CallSid: "CA1234567890ABCDE", Caller: "+14158675309", Digits: "1234", From: "+14158675309", To: "+18005551212" });
    expect(twilioSignature("12345", "https://mycompany.com/myapp.php?foo=1&bar=2", params)).toBe("RSOYDt4T1cUTdK1PDd93/VVr8B8=");
  });

  it("is order independent, and fails on a wrong token, URL or header", () => {
    const url = "https://od-demo-lyart.vercel.app/api/whatsapp/twilio-status";
    const a = new URLSearchParams({ MessageStatus: "delivered", MessageSid: "SM1" });
    const b = new URLSearchParams({ MessageSid: "SM1", MessageStatus: "delivered" });
    const sig = twilioSignature(TOKEN, url, a);
    expect(twilioSignature(TOKEN, url, b)).toBe(sig);
    expect(validTwilioSignature(TOKEN, sig, ["https://other.test/x", url], b)).toBe(true);
    expect(validTwilioSignature("other", sig, [url], b)).toBe(false);
    expect(validTwilioSignature(TOKEN, sig, ["https://other.test/x"], b)).toBe(false);
    expect(validTwilioSignature(TOKEN, null, [url], b)).toBe(false);
    expect(validTwilioSignature(TOKEN, "short", [url], b)).toBe(false);
  });
});

describe("twilio status mapping", () => {
  it.each([
    ["queued", "queued"],
    ["sending", "queued"],
    ["accepted", "queued"],
    ["sent", "sent"],
    ["delivered", "delivered"],
    ["read", "read"],
    ["failed", "failed"],
    ["undelivered", "failed"],
    ["receiving", null],
    [null, null],
  ])("%s -> %s", (raw, want) => expect(mapTwilioStatus(raw)).toBe(want));

  it("builds the error from ErrorCode and ErrorMessage, scrubbed", () => {
    expect(twilioStatusError(new URLSearchParams({ ErrorCode: "63016", ErrorMessage: "Outside the allowed window" }))).toBe(
      "63016: Outside the allowed window (set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet)",
    );
    expect(twilioStatusError(new URLSearchParams({ ErrorCode: "63003", MessageStatus: "undelivered" }))).toBe("63003: undelivered");
    expect(twilioStatusError(new URLSearchParams({ ErrorMessage: "bad number +91 98765 43210" }))).toBe("bad number •••");
  });
});

describe("POST /api/whatsapp/twilio-status", () => {
  const PUBLIC = "https://od-demo-lyart.vercel.app";
  const logs: string[] = [];
  beforeEach(() => {
    logs.length = 0;
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("TWILIO_AUTH_TOKEN", TOKEN);
    vi.stubEnv("WHATSAPP_PUBLIC_URL", PUBLIC);
    for (const level of ["log", "error"] as const) vi.spyOn(console, level).mockImplementation((...a: unknown[]) => void logs.push(a.join(" ")));
  });

  const post = (fields: Record<string, string>, headers: Record<string, string> = {}) =>
    twilioStatus(
      new NextRequest("http://localhost:3000/api/whatsapp/twilio-status", {
        method: "POST",
        body: new URLSearchParams(fields).toString(),
        headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
      }),
    );
  const signed = (fields: Record<string, string>, url = `${PUBLIC}/api/whatsapp/twilio-status`) =>
    post(fields, { "x-twilio-signature": twilioSignature(TOKEN, url, new URLSearchParams(fields)) });

  async function seed(sid: string) {
    const b = await memoryStore.create({ ...booking, notes: null });
    await memoryStore.logMessage({ bookingId: b.id, kind: "confirmation", provider: "twilio", toMasked: "••••3210", template: "text", status: "sent", providerMessageId: sid });
    return async () => (await memoryStore.listMessagesForBookings([b.id]))[0];
  }

  it("updates by sid when the signature is valid, forward only", async () => {
    const latest = await seed("SM_A");
    const fields = { MessageSid: "SM_A", MessageStatus: "read", AccountSid: SID, To: "whatsapp:+919876543210" };
    const res = await signed(fields);
    expect(res.status).toBe(200);
    expect((await latest()).status).toBe("read");
    expect((await signed({ ...fields, MessageStatus: "delivered" })).status).toBe(200);
    expect((await latest()).status).toBe("read");
    expect(logs).toContain("twilio status: read -> read");
    expect(logs.join("\n")).not.toContain("9876543210");
  });

  it("also accepts a signature over the URL the request arrived on", async () => {
    const latest = await seed("SM_B");
    const fields = { MessageSid: "SM_B", MessageStatus: "delivered" };
    expect((await signed(fields, "http://localhost:3000/api/whatsapp/twilio-status")).status).toBe(200);
    expect((await latest()).status).toBe("delivered");
  });

  it("answers 403 to a bad or missing signature, and changes nothing", async () => {
    const latest = await seed("SM_C");
    const fields = { MessageSid: "SM_C", MessageStatus: "failed", ErrorCode: "63016" };
    expect((await post(fields)).status).toBe(403);
    expect((await post(fields, { "x-twilio-signature": "bm9wZQ==" })).status).toBe(403);
    expect((await post(fields, { "x-twilio-signature": twilioSignature("wrong-token", `${PUBLIC}/api/whatsapp/twilio-status`, new URLSearchParams(fields)) })).status).toBe(403);
    expect((await latest()).status).toBe("sent");
    expect(logs).toContain("twilio status: bad signature, ignored");
  });

  it("maps undelivered to failed with the error code and message", async () => {
    const latest = await seed("SM_D");
    await signed({ MessageSid: "SM_D", MessageStatus: "undelivered", ErrorCode: "63016", ErrorMessage: "Outside the allowed window" });
    expect(await latest()).toMatchObject({ status: "failed", error: "63016: Outside the allowed window (set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet)" });
  });

  it("skips the check with one log line when TWILIO_AUTH_TOKEN is unset, and answers 200 to junk", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    const latest = await seed("SM_E");
    expect((await post({ MessageSid: "SM_E", MessageStatus: "delivered" })).status).toBe(200);
    expect((await latest()).status).toBe("delivered");
    expect(logs).toContain("twilio status: TWILIO_AUTH_TOKEN not set, signature not checked");
    expect((await post({ MessageSid: "SM_E", MessageStatus: "receiving" })).status).toBe(200);
    expect((await post({})).status).toBe(200);
    expect((await post({ MessageSid: "SM_UNKNOWN", MessageStatus: "sent" })).status).toBe(200);
  });

  it("answers 200 when the store fails", async () => {
    vi.spyOn(memoryStore, "updateMessageStatus").mockRejectedValue(new Error("db down"));
    expect((await signed({ MessageSid: "SM_F", MessageStatus: "delivered" })).status).toBe(200);
    expect(logs).toContain("twilio status update failed: db down");
  });
});
