// @vitest-environment node
/**
 * Ogi on the Solstice cafe pages. A fake model stands in for Gemini: these tests never call a real model.
 * They check the cafe profile, its tools, the event enquiry Confirm flow and the locks, the same way tests/ogi.test.ts
 * does for the clinic.
 */
import { MockLanguageModelV4 } from "ai/test";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CAFE_SLUG } from "@/lib/cafeEvents";
import { memoryEnquiryStore, resetMemoryEnquiries } from "@/lib/cafeEvents/memory";
import { memoryStore, resetMemoryStore } from "@/lib/bookings/memory";
import { resetRateLimits } from "@/lib/rateLimit";
import { resetUsedNonces, signConfirm, signEnquiryConfirm, verifyConfirm, type PendingEnquiry } from "@/lib/ogi/confirmToken";
import { runOgi } from "@/lib/ogi/engine";
import { profileForPage } from "@/lib/ogi/profiles";
import { checkReply } from "@/lib/ogi/replyCheck";
import { allowedTools, ENQUIRY_CONFIRM_NOTE, type EnquiryConfirmCard } from "@/lib/ogi/tools";

const fake = vi.hoisted(() => ({ model: null as unknown }));
vi.mock("@/lib/ogi/model", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ogi/model")>();
  return { ...real, getOgiModel: () => fake.model };
});

const { GET: chatGet, POST: chatPost } = await import("@/app/api/ogi/chat/route");
const { POST: confirmPost } = await import("@/app/api/ogi/confirm/route");

// Wednesday 25 Nov 2026, 11:30 in India.
const NOW = new Date("2026-11-25T06:00:00Z");
const TODAY = "2026-11-25";
const cafe = profileForPage("solstice-cafe")!;
const lotus = profileForPage("lotus-clinic")!;

type Result = Awaited<ReturnType<MockLanguageModelV4["doGenerate"]>>;
const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};
const say = (text: string): Result => ({ content: [{ type: "text", text }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] });
let callId = 0;
const call = (toolName: string, input: unknown): Result => ({
  content: [{ type: "tool-call", toolCallId: `call-${++callId}`, toolName, input: JSON.stringify(input) }],
  finishReason: { unified: "tool-calls", raw: undefined },
  usage,
  warnings: [],
});
const fakeModel = (...steps: Result[]) => new MockLanguageModelV4({ doGenerate: steps });

/** What a visitor tells Ogi, as the model would pass it to request_event_enquiry. */
const asked = { venue: "courtyard", eventType: "birthday", date: "2026-12-12", slot: "evening", guests: 25, name: "Asha Rao", phone: "98765 43210", notes: "Chocolate cake" };
const pending: PendingEnquiry = { venue: "courtyard", eventType: "birthday", date: "2026-12-12", slot: "evening", guests: 25, name: "Asha Rao", phone: "9876543210", notes: "Chocolate cake" };

function req(url: string, init: { method?: string; body?: unknown; ip?: string } = {}) {
  return new NextRequest(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", "x-forwarded-for": init.ip ?? "203.0.113.30" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
const chat = (body: unknown) => chatPost(req("/api/ogi/chat", { method: "POST", body }));
const confirm = (body: unknown) => confirmPost(req("/api/ogi/confirm", { method: "POST", body }));
const ask = (text: string) => ({ page: "solstice-cafe", messages: [{ role: "user", content: text }] });
const saved = () => memoryEnquiryStore.list(CAFE_SLUG);
const logs: string[] = [];

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  resetMemoryEnquiries();
  resetMemoryStore();
  resetRateLimits();
  resetUsedNonces();
  fake.model = null;
  logs.length = 0;
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("OGI_CONFIRM_SECRET", "test-ogi-secret");
  for (const level of ["log", "error", "warn", "info"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("the cafe profile", () => {
  it("is on the page allow-list as solstice-cafe, with the Solstice organization found from its slug", () => {
    expect(cafe).toMatchObject({ key: "solstice-cafe", orgId: "org_4v8c1n", kind: "cafe", mascot: "/brand/ogi-cafe.svg" });
    for (const page of ["solstice", "Solstice-Cafe", "cafe", "org_4v8c1n", "__proto__"]) expect(profileForPage(page), page).toBeUndefined();
  });

  it("answers from the cafe's own data: hours, both venues with guests, from-prices, slots and what is included", () => {
    expect(cafe.facts.hours).toMatch(/07:30 AM to 11:00 PM/);
    const events = cafe.facts.events as { venue: string; guests: string; price: string; minimum: string; slots: { id: string }[]; included: string[] }[];
    expect(events.map((e) => [e.venue, e.guests, e.price])).toEqual([
      ["The Courtyard", "15 to 40 guests", "From ₹1,200 per guest"],
      ["The Conservatory", "8 to 20 guests", "From ₹1,500 per guest"],
    ]);
    expect(events[0].slots.map((s) => s.id)).toEqual(["morning", "sundowner", "evening"]);
    expect(events[1].included.length).toBeGreaterThan(3);
    expect((cafe.facts.menu as { price: string }[]).length).toBe(12);
    expect(cafe.rules.join(" ")).toMatch(/Never work out a total, a final price/);
  });

  it("gives the visitor only the cafe tools on the cafe page, and the clinic only the clinic tools", () => {
    expect(allowedTools("visitor", cafe).sort()).toEqual(["cafe_info", "hand_over", "request_event_enquiry"]);
    expect(allowedTools("visitor", lotus).sort()).toEqual(["clinic_info", "hand_over", "request_visit"]);
    for (const role of ["owner", "admin", "staff", ""]) expect(allowedTools(role, cafe), role).toEqual([]);
  });

  it("offers the model exactly those tools", async () => {
    const model = fakeModel(say("Hello."));
    await runOgi({ profile: cafe, role: "visitor", messages: [{ role: "user", content: "hi" }], model, today: TODAY });
    expect((model.doGenerateCalls[0].tools ?? []).map((t) => t.name).sort()).toEqual(["cafe_info", "hand_over", "request_event_enquiry"]);
  });

  it("greets on GET for the cafe page", async () => {
    fake.model = fakeModel(say("x"));
    const body = (await (await chatGet(req("/api/ogi/chat?page=solstice-cafe"))).json()) as { greeting: string; awake: boolean };
    expect(body).toMatchObject({ awake: true });
    expect(body.greeting).toMatch(/Solstice assistant/);
  });
});

describe("cafe_info and the reply check", () => {
  it("looks up the venues from the profile and passes a from-price answer", async () => {
    fake.model = fakeModel(call("cafe_info", { topic: "events" }), say("The Courtyard takes up to 40 guests, from ₹1,200 per guest. The cafe confirms the final quote."));
    const res = await chat(ask("How much is the courtyard?"));
    const body = (await res.json()) as { reply: string; kind: string };
    expect(body).toMatchObject({ kind: "answer" });
    expect(body.reply).toContain("from ₹1,200 per guest");
    expect(logs.some((l) => l.includes("ogi tool") && l.includes("tool=cafe_info") && l.includes("page=solstice-cafe"))).toBe(true);
  });

  it("attack: never lets a final price or total through, only the from-prices in the facts", async () => {
    fake.model = fakeModel(say("For 25 guests that will be ₹30,000 in total."));
    const body = (await (await chat(ask("What is the final price for 25 guests?"))).json()) as { reply: string; kind: string };
    expect(body.kind).toBe("blocked");
    expect(body.reply).not.toContain("30,000");
    expect(body.reply).toContain("+91 73821 30063");
    expect(checkReply("A 10% discount brings it to ₹27,000.", { profile: cafe })).toEqual({ ok: false, reasons: ["money"] });
    expect(checkReply("From ₹1,500 per guest, minimum 8 guests, so from ₹12,000.", { profile: cafe })).toEqual({ ok: true });
  });

  it("attack: blocks another demo business's name or number on the cafe page, and the cafe's on the clinic page", () => {
    expect(checkReply("Try Lotus Women's Clinic instead.", { profile: cafe })).toMatchObject({ ok: false });
    expect(checkReply("Call 98765 43210.", { profile: cafe })).toMatchObject({ ok: false, reasons: ["phone"] });
    expect(checkReply("WhatsApp us on +91 73821 30063.", { profile: cafe })).toEqual({ ok: true });
    expect(checkReply("Solstice Roastery has a garden.", { profile: lotus })).toMatchObject({ ok: false, reasons: ["business_name"] });
  });

  it("sends plain text even when the model answers in markdown", async () => {
    fake.model = fakeModel(say("**The Conservatory** takes *up to 20* guests."));
    const body = (await (await chat(ask("conservatory size?"))).json()) as { reply: string };
    expect(body.reply).toBe("The Conservatory takes up to 20 guests.");
  });
});

describe("an event enquiry needs the visitor's signed Confirm", () => {
  it("request_event_enquiry only prepares a summary: nothing is saved, even if the model says it is booked", async () => {
    fake.model = fakeModel(call("request_event_enquiry", asked), say("Done, it is booked!"));
    const body = (await (await chat(ask("Book the courtyard for my birthday"))).json()) as { confirm: EnquiryConfirmCard };
    expect(body.confirm).toMatchObject({
      kind: "event_enquiry",
      note: ENQUIRY_CONFIRM_NOTE,
      summary: { venue: "The Courtyard", event: "Birthday", time: "Evening, 7:30 – 10:30 PM", guests: "25", name: "Asha Rao", phone: "9876543210", notes: "Chocolate cake" },
    });
    expect(await saved()).toEqual([]);
  });

  it("the model never sees the Confirm token or the phone", async () => {
    const model = fakeModel(call("request_event_enquiry", asked), say("Please check the summary."));
    const out = await runOgi({ profile: cafe, role: "visitor", messages: [{ role: "user", content: "enquire" }], model, today: TODAY });
    const toolResult = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(toolResult).not.toContain(out.confirm!.token);
    expect(toolResult).toContain("Nothing is sent until they press Confirm");
    expect(toolResult).not.toMatch(/9876543210/);
  });

  it("asks again when the details fail the venue's checks (too many guests, wrong slot, past date)", async () => {
    const model = fakeModel(call("request_event_enquiry", { ...asked, venue: "conservatory", guests: 30, slot: "sundowner", date: "2026-11-01" }), say("Let me check a few details."));
    const out = await runOgi({ profile: cafe, role: "visitor", messages: [{ role: "user", content: "enquire" }], model, today: TODAY });
    expect(out.confirm).toBeUndefined();
    const result = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(result).toContain("The Conservatory takes 8 to 20 guests.");
    expect(result).toContain("Choose a time.");
    expect(result).toContain("Pick today or a later date.");
  });

  it("saves once on a valid Confirm, through the form's service, marked via Ogi with the visitor's first-touch source", async () => {
    const signed = signEnquiryConfirm("solstice-cafe", pending)!;
    const res = await confirm({ token: signed.token, source: "google_ads", campaign: "events-jubilee-hills", utm: { utm_source: "google", gclid: "x" } });
    expect(res.status).toBe(201);
    const { ref } = (await res.json()) as { ref: string };
    const [e] = await saved();
    expect(e).toMatchObject({ reference: ref, channel: "ogi", source: "google_ads", campaign: "events-jubilee-hills", utm: { utm_source: "google", gclid: "x" }, guests: 25, phone: "9876543210", status: "new" });
    expect((await confirm({ token: signed.token })).status).toBe(409);
    expect(await saved()).toHaveLength(1);
  });

  it("re-checks the enquiry on Confirm: a token whose date has since passed is refused, and can be tried again later", async () => {
    const signed = signEnquiryConfirm("solstice-cafe", { ...pending, date: "2026-11-24" })!;
    const res = await confirm({ token: signed.token });
    expect(res.status).toBe(400);
    expect(await saved()).toEqual([]);
  });

  it("attack: an enquiry token only works on a page with the enquiry tool, and a visit token never saves an enquiry", async () => {
    expect((await confirm({ token: signEnquiryConfirm("lotus-clinic", pending)!.token })).status).toBe(400);
    const visit = { name: "Priya Sharma", phone: "9876543210", visitType: "clinic", date: "2026-11-27", slot: "Morning, 10 am – 1 pm", reason: "Pregnancy care" } as const;
    expect((await confirm({ token: signConfirm("solstice-cafe", visit)!.token })).status).toBe(400);
    expect(await saved()).toEqual([]);
    expect(await memoryStore.list({ from: "2000-01-01" })).toEqual([]);
  });

  it("attack: a forged or edited enquiry token is refused", async () => {
    const signed = signEnquiryConfirm("solstice-cafe", pending)!;
    const [body, sig] = signed.token.split(".");
    const edited = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    edited.enquiry.guests = 40;
    edited.page = "solstice-cafe";
    const forged = `${Buffer.from(JSON.stringify(edited)).toString("base64url")}.${sig}`;
    expect(verifyConfirm(forged)).toEqual({ ok: false, reason: "invalid" });
    expect((await confirm({ token: forged })).status).toBe(400);
    expect((await confirm({ token: `${body}.not-the-signature` })).status).toBe(400);
    expect(await saved()).toEqual([]);
  });

  it("logs the confirm without the visitor's name or phone", async () => {
    await confirm({ token: signEnquiryConfirm("solstice-cafe", pending)!.token });
    expect(logs.some((l) => l.includes("tool=confirm") && l.includes("outcome=enquiry_sent"))).toBe(true);
    expect(logs.join("\n")).not.toMatch(/Asha|9876543210/);
  });
});
