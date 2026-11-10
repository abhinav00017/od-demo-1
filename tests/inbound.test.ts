// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as inbound } from "@/app/api/whatsapp/twilio-inbound/route";
import { clinicTomorrow } from "@/lib/bookings";
import { memoryStore, resetMemoryStore } from "@/lib/bookings/memory";
import { inboundIntent, maskedSender, resetInboundReplies, senderPhone, STOP_WORDS, twiml } from "@/lib/whatsapp/inbound";
import { shortDate } from "@/lib/whatsapp/messages";
import { twilioSignature } from "@/lib/whatsapp/twilioStatus";

const PUBLIC = "https://od-demo-lyart.vercel.app";
const URL_PATH = `${PUBLIC}/api/whatsapp/twilio-inbound`;
const TOKEN = "made-up-auth-token";
const FROM = "whatsapp:+919876543210";

describe("inbound helpers", () => {
  it("normalises the sender to 10 digits, and masks it to the last 4", () => {
    expect(senderPhone("whatsapp:+919876543210")).toBe("9876543210");
    expect(senderPhone("+919876543210")).toBe("9876543210");
    expect(senderPhone("WhatsApp:+91 98765 43210")).toBe("9876543210");
    expect(senderPhone("whatsapp:+14155238886")).toBeUndefined();
    expect(senderPhone(null)).toBeUndefined();
    expect(maskedSender(FROM)).toBe("••••3210");
  });

  it("reads the intent from the button payload, then the button text, then the body", () => {
    const intent = (f: Record<string, string>) => inboundIntent(new URLSearchParams(f));
    expect(intent({ ButtonPayload: "confirm", Body: "Confirm" })).toBe("CONFIRM");
    expect(intent({ ButtonText: "Change time", Body: "Change time" })).toBe("CHANGE");
    expect(intent({ ButtonPayload: "change", ButtonText: "Change" })).toBe("CHANGE");
    for (const word of ["STOP", "stop", "Unsubscribe", "stopall", "end", "Quit", "revoke", "optout", "Stop."]) expect(intent({ Body: word })).toBe("STOP");
    for (const word of ["CANCEL", "cancel", "  Cancel ", "Cancel."]) expect(intent({ Body: word })).toBe("CANCEL");
    for (const word of ["START", "start", "unstop"]) expect(intent({ Body: word })).toBe("START");
    expect(intent({ ButtonPayload: "change_time" })).toBe("CHANGE");
    expect(intent({ Body: "  C " })).toBe("CONFIRM");
    expect(intent({ Body: "YES" })).toBe("CONFIRM");
    expect(intent({ Body: "r" })).toBe("CHANGE");
    expect(intent({ Body: "Reschedule" })).toBe("CHANGE");
    expect(intent({ Body: "Can I come at 4?" })).toBe("OTHER");
    expect(intent({ ButtonPayload: "something else", Body: "confirm" })).toBe("OTHER");
    expect(intent({})).toBe("OTHER");
  });

  it("keeps CANCEL out of the opt-out words, and keeps the rest", () => {
    expect(STOP_WORDS.has("cancel")).toBe(false);
    for (const word of ["stop", "stopall", "unsubscribe", "end", "quit", "revoke", "optout"]) expect(STOP_WORDS.has(word)).toBe(true);
  });

  it("builds TwiML and escapes the message", () => {
    expect(twiml()).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    expect(twiml("A & B <c>")).toContain("<Message>A &amp; B &lt;c&gt;</Message>");
  });
});

describe("POST /api/whatsapp/twilio-inbound", () => {
  const logs: string[] = [];
  beforeEach(() => {
    logs.length = 0;
    resetMemoryStore();
    resetInboundReplies();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("TWILIO_AUTH_TOKEN", TOKEN);
    vi.stubEnv("WHATSAPP_PUBLIC_URL", PUBLIC);
    for (const level of ["log", "error"] as const) vi.spyOn(console, level).mockImplementation((...a: unknown[]) => void logs.push(a.join(" ")));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const post = (fields: Record<string, string>, headers: Record<string, string> = {}) =>
    inbound(
      new NextRequest("http://localhost:3000/api/whatsapp/twilio-inbound", {
        method: "POST",
        body: new URLSearchParams(fields).toString(),
        headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
      }),
    );
  const signed = (fields: Record<string, string>, url = URL_PATH) => post(fields, { "x-twilio-signature": twilioSignature(TOKEN, url, new URLSearchParams(fields)) });
  const msg = (fields: Record<string, string>) => ({ From: FROM, To: "whatsapp:+17372508034", MessageSid: "SM_IN", ...fields });

  const day = clinicTomorrow();
  const seed = (over: Partial<{ phone: string; date: string; visitType: string }> = {}) =>
    memoryStore.create({ clinicSlug: "lotus-clinic", name: "Priya Sharma", phone: "9876543210", visitType: "clinic", date: day, slot: "Morning, 10 am – 1 pm", reason: "Pregnancy care", ...over });
  const current = async (id: string) => (await memoryStore.list({ from: "2000-01-01" })).find((b) => b.id === id)!;

  it("answers 403 to a missing or wrong signature, and changes nothing", async () => {
    const b = await seed();
    expect((await post(msg({ ButtonPayload: "confirm" }))).status).toBe(403);
    expect((await post(msg({ ButtonPayload: "confirm" }), { "x-twilio-signature": twilioSignature("wrong", URL_PATH, new URLSearchParams(msg({ ButtonPayload: "confirm" }))) })).status).toBe(403);
    expect((await current(b.id)).status).toBe("new");
    expect(logs).toContain("twilio inbound: bad signature, ignored");
  });

  it("accepts a signature over the URL the request arrived on", async () => {
    await seed();
    const res = await signed(msg({ Body: "hello" }), "http://localhost:3000/api/whatsapp/twilio-inbound");
    expect(res.status).toBe(200);
  });

  /** A booking staff moved: confirmed, waiting for the patient. */
  const moved = async (over: Partial<{ phone: string; date: string; visitType: string }> = {}) => {
    const b = await seed(over);
    return (await memoryStore.reschedule(b.id, b.date, "Evening, 5 pm – 7 pm", { awaitingPatient: true }))!;
  };

  it("CONFIRM by button payload on a moved visit clears the wait, logs it, sends no template, and thanks the patient", async () => {
    const b = await moved();
    const res = await signed(msg({ ButtonPayload: "confirm", ButtonText: "Confirm", Body: "Confirm" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/xml");
    const xml = await res.text();
    expect(xml).toContain(`<Message>Thank you, see you on ${shortDate(day)}, Evening, 5 pm – 7 pm.</Message>`);
    expect(await current(b.id)).toMatchObject({ status: "confirmed", awaitingPatient: false });
    const log = await memoryStore.listMessagesForBookings([b.id]);
    expect(log.map((m) => m.kind)).toEqual(["patient_confirmed", "inbound"]);
    expect(log[1]).toMatchObject({ template: "CONFIRM", toMasked: "••••3210", status: "delivered", provider: "twilio" });
    expect(log.some((m) => m.kind === "confirmation")).toBe(false);
    expect(logs.some((l) => /^twilio inbound: CONFIRM from ••••3210, booking [0-9A-F]{8}$/.test(l))).toBe(true);
    expect(logs.join("\n")).not.toContain("9876543210");
  });

  it("CONFIRM by a plain 'C' works too on a moved visit", async () => {
    const b = await moved();
    const xml = await (await signed(msg({ Body: "C" }))).text();
    expect(xml).toContain("Thank you, see you on");
    expect((await current(b.id)).awaitingPatient).toBe(false);
  });

  it("CONFIRM or C without a moved visit is just a message: no status change, the polite reply", async () => {
    const b = await seed();
    const xml = await (await signed(msg({ Body: "C" }))).text();
    expect(xml).toContain("Thanks for your message.");
    expect(await current(b.id)).toMatchObject({ status: "new", awaitingPatient: false });
    expect((await memoryStore.listMessagesForBookings([b.id]))[0]).toMatchObject({ kind: "inbound", template: "OTHER" });
  });

  it("CHANGE on a moved visit replies with the patient's own page link and changes nothing else", async () => {
    const b = await moved({ visitType: "online" });
    const xml = await (await signed(msg({ ButtonPayload: "change", ButtonText: "Change" }))).text();
    expect(xml).toContain(`<Message>No problem. Pick another day or time here: ${PUBLIC}/clinic/website/v/${b.viewToken}</Message>`);
    expect(await current(b.id)).toMatchObject({ status: "confirmed", wantsNewTime: false, awaitingPatient: true });
    expect((await memoryStore.listMessagesForBookings([b.id]))[0]).toMatchObject({ kind: "inbound", template: "CHANGE" });
  });

  it("CHANGE without a moved visit is just a message", async () => {
    const b = await seed();
    const xml = await (await signed(msg({ Body: "Change time" }))).text();
    expect(xml).toContain("Thanks for your message.");
    expect((await current(b.id)).wantsNewTime).toBe(false);
  });

  it("CANCEL with an upcoming booking replies with its patient page link, and neither cancels nor opts out", async () => {
    const b = await seed();
    const xml = await (await signed(msg({ Body: "  CANCEL " }))).text();
    expect(xml).toContain(`<Message>To cancel or change your visit, open: ${PUBLIC}/clinic/website/v/${b.viewToken}</Message>`);
    expect((await current(b.id)).status).toBe("new");
    expect((await memoryStore.whatsappBlocks(["9876543210"])).optedOut).toEqual([]);
    expect((await memoryStore.listMessagesForBookings([b.id]))[0]).toMatchObject({ kind: "inbound", template: "CANCEL" });
    expect(logs.some((l) => /^twilio inbound: CANCEL from ••••3210, booking [0-9A-F]{8}$/.test(l))).toBe(true);
  });

  it("CANCEL with no upcoming booking is just a message: the polite reply, not opted out", async () => {
    const past = await seed({ date: "2020-01-01" });
    const xml = await (await signed(msg({ Body: "cancel" }))).text();
    expect(xml).toContain("Thanks for your message.");
    expect(xml).not.toContain("won't get more WhatsApp messages");
    expect((await current(past.id)).status).toBe("new");
    expect((await memoryStore.whatsappBlocks(["9876543210"])).optedOut).toEqual([]);
    expect(logs).toContain("twilio inbound: OTHER from ••••3210, booking none");
  });

  it("acts on the sender's booking that waits for them, before a newer one", async () => {
    const waiting = await moved();
    const newer = await seed();
    await seed({ phone: "9123456789" });
    await signed(msg({ Body: "confirm" }));
    expect((await current(waiting.id)).awaitingPatient).toBe(false);
    expect((await memoryStore.listMessagesForBookings([newer.id])).length).toBe(0);
  });

  it("OTHER with a booking: one auto-reply per hour, logged as inbound", async () => {
    const b = await seed();
    const first = await (await signed(msg({ Body: "Is parking available? My number is 98765 43210" }))).text();
    expect(first).toContain(`<Message>Thanks for your message. For bookings use ${PUBLIC}/clinic/website/book or call +91 73821 30063.</Message>`);
    const second = await (await signed(msg({ Body: "Hello?" }))).text();
    expect(second).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    expect((await current(b.id)).status).toBe("new");
    const log = await memoryStore.listMessagesForBookings([b.id]);
    expect(log.map((m) => m.template)).toEqual(["OTHER", "OTHER"]);
    expect(logs.join("\n")).not.toContain("parking");
  });

  it("OTHER or CONFIRM with no open booking: the auto-reply, nothing changed", async () => {
    const past = await seed({ date: "2020-01-01" });
    const xml = await (await signed(msg({ ButtonPayload: "confirm" }))).text();
    expect(xml).toContain("Thanks for your message.");
    expect((await current(past.id)).status).toBe("new");
    expect(await memoryStore.listMessagesForBookings([past.id])).toEqual([]);
    expect(logs).toContain("twilio inbound: OTHER from ••••3210, booking none");
  });

  it("skips the check with one log line when TWILIO_AUTH_TOKEN is unset, and answers 200 to an empty form", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    const res = await post({});
    expect(res.status).toBe(200);
    expect(logs).toContain("twilio inbound: TWILIO_AUTH_TOKEN not set, signature not checked");
  });
});
