// @vitest-environment node
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/crm/login/route";
import { GET as session } from "@/app/api/crm/session/route";
import { GET as today } from "@/app/api/crm/today/route";
import { GET as listLeads, POST as createLead } from "@/app/api/crm/leads/route";
import { GET as getLead, PATCH as patchLead } from "@/app/api/crm/leads/[id]/route";
import { PATCH as patchFollowup } from "@/app/api/crm/followups/[id]/route";
import { GET as listProducts, POST as createProduct } from "@/app/api/crm/products/route";
import { PATCH as patchProduct } from "@/app/api/crm/products/[id]/route";
import { POST as createQuote } from "@/app/api/crm/quotes/route";
import { GET as getQuote, PUT as saveQuote } from "@/app/api/crm/quotes/[id]/route";
import { POST as sendQuote } from "@/app/api/crm/quotes/[id]/send/route";
import { POST as setStatus } from "@/app/api/crm/quotes/[id]/status/route";
import { GET as customers } from "@/app/api/crm/customers/route";
import { GET as publicQuote } from "@/app/api/crm/public/quotes/[number]/route";
import { CRM_AUTH, LOTUS_AUTH, signSession } from "@/lib/admin/auth";
import { memoryCrmStore as store, resetMemoryCrmStore } from "@/lib/crm/memory";
import { resetRateLimits } from "@/lib/rateLimit";

// Saturday 24 Oct 2026, 11:30 in India.
const NOW = new Date("2026-10-24T06:00:00Z");
const SHOP = "kalyani-tiles";

function req(url: string, init: { method?: string; body?: unknown; cookie?: string | null } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" };
  const cookie = init.cookie === undefined ? crmCookie() : init.cookie;
  if (cookie) headers.cookie = cookie;
  return new NextRequest(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
}
const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });
const crmCookie = () => `${CRM_AUTH.cookie}=${signSession("crm-secret", Date.now(), undefined, CRM_AUTH.scope)}`;

const logs: string[] = [];

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  resetMemoryCrmStore();
  resetRateLimits();
  logs.length = 0;
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("CRM_ADMIN_PASSWORD", "tiles-pass");
  vi.stubEnv("CRM_ADMIN_SECRET", "crm-secret");
  vi.stubEnv("ADMIN_PASSWORD", "lotus-pass");
  vi.stubEnv("ADMIN_SECRET", "crm-secret");
  vi.stubEnv("WHATSAPP_FAKE", "1");
  vi.stubEnv("WHATSAPP_PUBLIC_URL", "");
  for (const level of ["log", "error", "warn", "info"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function product(overrides: Record<string, unknown> = {}) {
  return store.createProduct(SHOP, {
    sku: "KT-T1",
    name: "Test Marble",
    brand: "Vitrano",
    category: "floor",
    sizeMm: "600x600",
    finish: "Glossy",
    pricePerBox: 1000_00,
    sqftPerBox: 15.5,
    piecesPerBox: 4,
    imageUrl: null,
    active: true,
    ...overrides,
  });
}

async function newLead(phone = "+91 98765 00001", name = "Asha Rao") {
  const res = await createLead(req("/api/crm/leads", { method: "POST", body: { name, phone, source: "walk-in" } }));
  return (await res.json()).lead as { id: string; phone: string };
}

describe("CRM login", () => {
  it("refuses a wrong password and sets a crm_session cookie for the right one", async () => {
    expect((await login(req("/api/crm/login", { method: "POST", body: { password: "nope" }, cookie: null }))).status).toBe(401);
    const res = await login(req("/api/crm/login", { method: "POST", body: { password: "tiles-pass" }, cookie: null }));
    expect(res.status).toBe(200);
    const set = res.headers.get("set-cookie") ?? "";
    expect(set).toMatch(/^crm_session=crm\.\d+\./);
    expect(set).toMatch(/HttpOnly/i);
    const s = await (await session(req("/api/crm/session", { cookie: set.split(";")[0] }))).json();
    expect(s).toEqual({ configured: true, devPassword: false, authed: true });
  });

  it("is off in production without CRM_ADMIN_PASSWORD, and says demo in development", async () => {
    vi.stubEnv("CRM_ADMIN_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await login(req("/api/crm/login", { method: "POST", body: { password: "demo" }, cookie: null }))).status).toBe(503);
    vi.stubEnv("NODE_ENV", "development");
    expect(await (await session(req("/api/crm/session", { cookie: null }))).json()).toEqual({ configured: true, devPassword: true, authed: false });
  });

  it("does not accept the clinic dashboard cookie, even signed with the same secret", async () => {
    const lotus = `${CRM_AUTH.cookie}=${signSession("crm-secret", Date.now(), undefined, LOTUS_AUTH.scope)}`;
    expect((await listLeads(req("/api/crm/leads", { cookie: lotus }))).status).toBe(401);
  });

  it("guards every CRM endpoint", async () => {
    const id = "0f8e2c1a-1111-4222-8333-444455556666";
    const out = { cookie: null };
    const statuses = await Promise.all([
      today(req("/api/crm/today", out)),
      listLeads(req("/api/crm/leads", out)),
      createLead(req("/api/crm/leads", { ...out, method: "POST", body: {} })),
      getLead(req(`/api/crm/leads/${id}`, out), ctx({ id })),
      patchLead(req(`/api/crm/leads/${id}`, { ...out, method: "PATCH", body: {} }), ctx({ id })),
      patchFollowup(req(`/api/crm/followups/${id}`, { ...out, method: "PATCH", body: {} }), ctx({ id })),
      listProducts(req("/api/crm/products", out)),
      createProduct(req("/api/crm/products", { ...out, method: "POST", body: {} })),
      patchProduct(req(`/api/crm/products/${id}`, { ...out, method: "PATCH", body: {} }), ctx({ id })),
      createQuote(req("/api/crm/quotes", { ...out, method: "POST", body: {} })),
      getQuote(req(`/api/crm/quotes/${id}`, out), ctx({ id })),
      saveQuote(req(`/api/crm/quotes/${id}`, { ...out, method: "PUT", body: {} }), ctx({ id })),
      sendQuote(req(`/api/crm/quotes/${id}/send`, { ...out, method: "POST" }), ctx({ id })),
      setStatus(req(`/api/crm/quotes/${id}/status`, { ...out, method: "POST", body: {} }), ctx({ id })),
      customers(req("/api/crm/customers", out)),
    ]);
    expect(statuses.map((r) => r.status)).toEqual(Array(15).fill(401));
  });
});

describe("leads", () => {
  it("creates a lead with the number normalised to 10 digits", async () => {
    const res = await createLead(req("/api/crm/leads", { method: "POST", body: { name: "  Asha Rao ", phone: "+91 98765-00001", source: "call", notes: "Kitchen" } }));
    expect(res.status).toBe(201);
    expect((await res.json()).lead).toMatchObject({ name: "Asha Rao", phone: "9876500001", status: "lead", source: "call", notes: "Kitchen" });
  });

  it("answers 400 with field errors for a bad number, name or source", async () => {
    const res = await createLead(req("/api/crm/leads", { method: "POST", body: { name: "A", phone: "12345", source: "billboard" } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(Object.keys(body.fieldErrors).sort()).toEqual(["name", "phone", "source"]);
    expect(body.fieldErrors.phone).toBe("Enter a 10-digit mobile number, like 98765 43210.");
  });

  it("answers 409 for a number already saved, with the existing lead", async () => {
    const first = await newLead("9876500001");
    const res = await createLead(req("/api/crm/leads", { method: "POST", body: { name: "Other", phone: "098765 00001", source: "walk-in" } }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ existingId: first.id, error: "This number is already saved for Asha Rao.", fieldErrors: { phone: "This number is already saved." } });
    expect(await store.listLeads(SHOP)).toHaveLength(1);
  });

  it("searches by name or number and filters by status", async () => {
    await newLead("9876500001", "Asha Rao");
    await newLead("9123400002", "Bala Krishna");
    const names = async (q: string) => ((await (await listLeads(req(`/api/crm/leads?${q}`))).json()).leads as { name: string }[]).map((l) => l.name);
    expect(await names("q=asha")).toEqual(["Asha Rao"]);
    expect(await names("q=91234")).toEqual(["Bala Krishna"]);
    expect(await names("status=customer")).toEqual([]);
  });

  it("marks a lead lost and back, but never un-makes a customer", async () => {
    const lead = await newLead();
    const lost = await patchLead(req(`/api/crm/leads/${lead.id}`, { method: "PATCH", body: { status: "lost" } }), ctx({ id: lead.id }));
    expect((await lost.json()).lead.status).toBe("lost");
    expect((await patchLead(req(`/api/crm/leads/${lead.id}`, { method: "PATCH", body: { status: "customer" } }), ctx({ id: lead.id }))).status).toBe(400);
    await store.markCustomer(SHOP, lead.id, NOW.toISOString());
    expect((await patchLead(req(`/api/crm/leads/${lead.id}`, { method: "PATCH", body: { status: "lead" } }), ctx({ id: lead.id }))).status).toBe(409);
  });
});

describe("products", () => {
  it("adds a product with the price in rupees stored as paise, and refuses a duplicate SKU", async () => {
    const body = { sku: "KT-N1", name: "New Tile", brand: "Stonecraft", category: "wall", sizeMm: "300 x 600", finish: "Matt", pricePerBox: 640.5, sqftPerBox: 11.63, piecesPerBox: 6, imageUrl: "" };
    const res = await createProduct(req("/api/crm/products", { method: "POST", body }));
    expect(res.status).toBe(201);
    expect((await res.json()).product).toMatchObject({ sizeMm: "300x600", pricePerBox: 64050, imageUrl: null, active: true });
    expect((await createProduct(req("/api/crm/products", { method: "POST", body }))).status).toBe(409);
    const bad = await createProduct(req("/api/crm/products", { method: "POST", body: { ...body, sku: "KT-N2", sizeMm: "big", pricePerBox: 0 } }));
    expect(Object.keys((await bad.json()).fieldErrors).sort()).toEqual(["pricePerBox", "sizeMm"]);
  });

  it("switches a product off", async () => {
    const p = await product();
    const res = await patchProduct(req(`/api/crm/products/${p.id}`, { method: "PATCH", body: { active: false } }), ctx({ id: p.id }));
    expect((await res.json()).product).toMatchObject({ active: false, name: "Test Marble" });
  });
});

describe("quotes", () => {
  it("builds a quote by area: boxes rounded up with wastage, line totals and discount", async () => {
    const p = await product();
    const lead = await newLead();
    const res = await createQuote(
      req("/api/crm/quotes", {
        method: "POST",
        body: { leadId: lead.id, items: [{ productId: p.id, areaSqft: 120, wastagePct: 10 }, { productId: p.id, qtyBoxes: 2 }], discount: 500, notes: "Hall" },
      }),
    );
    expect(res.status).toBe(201);
    const { quote } = await res.json();
    expect(quote).toMatchObject({ number: "KT-0001", status: "draft", subtotal: 11000_00, discount: 500_00, total: 10500_00, notes: "Hall" });
    expect(quote.items.map((i: { qtyBoxes: number; lineTotal: number }) => [i.qtyBoxes, i.lineTotal])).toEqual([
      [9, 9000_00],
      [2, 2000_00],
    ]);
  });

  it("refuses a discount above the subtotal, an unknown product and an empty quote", async () => {
    const p = await product();
    const lead = await newLead();
    const post = (body: unknown) => createQuote(req("/api/crm/quotes", { method: "POST", body }));
    const big = await post({ leadId: lead.id, items: [{ productId: p.id, qtyBoxes: 1 }], discount: 5000 });
    expect([big.status, (await big.json()).error]).toEqual([400, "The discount is more than the quote."]);
    expect((await post({ leadId: lead.id, items: [{ productId: "0f8e2c1a-1111-4222-8333-444455556666", qtyBoxes: 1 }] })).status).toBe(400);
    expect((await post({ leadId: lead.id, items: [] })).status).toBe(400);
    expect((await post({ leadId: lead.id, items: [{ productId: p.id }] })).status).toBe(400);
  });

  it("saves new lines on a draft, and reprices from the catalogue", async () => {
    const p = await product();
    const lead = await newLead();
    const { quote } = await (await createQuote(req("/api/crm/quotes", { method: "POST", body: { leadId: lead.id, items: [{ productId: p.id, qtyBoxes: 1 }] } }))).json();
    await store.updateProduct(SHOP, p.id, { pricePerBox: 1100_00 });
    const res = await saveQuote(req(`/api/crm/quotes/${quote.id}`, { method: "PUT", body: { items: [{ productId: p.id, qtyBoxes: 3 }], discount: 0 } }), ctx({ id: quote.id }));
    expect((await res.json()).quote).toMatchObject({ subtotal: 3300_00, total: 3300_00, items: [{ qtyBoxes: 3, unitPrice: 1100_00 }] });
  });

  it("sends on WhatsApp through the fake sender: logs one masked line, marks it sent and logs the message", async () => {
    const p = await product();
    const lead = await newLead("9876500001");
    const { quote } = await (await createQuote(req("/api/crm/quotes", { method: "POST", body: { leadId: lead.id, items: [{ productId: p.id, qtyBoxes: 2 }] } }))).json();
    const res = await sendQuote(req(`/api/crm/quotes/${quote.id}/send`, { method: "POST" }), ctx({ id: quote.id }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote).toMatchObject({ status: "sent", sentAt: NOW.toISOString() });
    expect(body.message).toMatchObject({ kind: "quote_sent", provider: "fake", status: "sent", toMasked: "••••0001", template: "crm_quote" });
    expect(logs).toContain("whatsapp (fake): template crm_quote to ••••0001");
    // No log line carries the full number.
    expect(logs.join("\n")).not.toMatch(/9876500001|98765 00001/);
    expect((await store.getLead(SHOP, lead.id))?.lastContactAt).toBe(NOW.toISOString());
  });

  it("puts the quote link with its key in the WhatsApp text", async () => {
    const p = await product();
    const lead = await newLead("9876500001");
    const { quote } = await (await createQuote(req("/api/crm/quotes", { method: "POST", body: { leadId: lead.id, items: [{ productId: p.id, qtyBoxes: 2 }] } }))).json();
    vi.stubEnv("WHATSAPP_FAKE", "");
    vi.stubEnv("WHATSAPP_PROVIDER", "twilio");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "ACtest");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token");
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "+15550001111");
    vi.stubEnv("TWILIO_API_BASE", "http://twilio.mock");
    vi.stubEnv("WHATSAPP_PUBLIC_URL", "https://demo.example");
    const sent: URLSearchParams[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      sent.push(new URLSearchParams(String(init.body)));
      return new Response(JSON.stringify({ sid: "SMtest" }), { status: 201 });
    });
    const res = await sendQuote(req(`/api/crm/quotes/${quote.id}/send`, { method: "POST" }), ctx({ id: quote.id }));
    vi.unstubAllGlobals();
    expect((await res.json()).message).toMatchObject({ provider: "twilio", template: "text", providerMessageId: "SMtest" });
    expect(sent).toHaveLength(1);
    expect(sent[0].get("To")).toBe("whatsapp:+919876500001");
    expect(sent[0].get("Body")).toBe(
      `Hello Asha, thank you for visiting Kalyani Tiles & Sanitary. Your quote KT-0001 for ₹2,000 is ready: https://demo.example/tiles/crm/q/KT-0001?k=${encodeURIComponent(quote.publicKey)} Prices are valid for 7 days. Call us on +91 73821 30063 with any questions.`,
    );
  });

  it("never sends a seed (demo) number to a real provider", async () => {
    resetMemoryCrmStore({ seed: true });
    vi.stubEnv("WHATSAPP_FAKE", "");
    vi.stubEnv("WHATSAPP_PROVIDER", "twilio");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "ACtest");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token");
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "+15550001111");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const leads = await (await listLeads(req("/api/crm/leads"))).json();
    const ravi = leads.leads.find((l: { name: string }) => l.name === "Ravi Teja Varma");
    const res = await sendQuote(req(`/api/crm/quotes/${ravi.latestQuote.id}/send`, { method: "POST" }), ctx({ id: ravi.latestQuote.id }));
    vi.unstubAllGlobals();
    expect((await res.json()).message).toMatchObject({ provider: "fake", status: "sent" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mark sold flips the lead to customer; the sold quote is then closed", async () => {
    const p = await product();
    const lead = await newLead();
    const make = async () =>
      (await (await createQuote(req("/api/crm/quotes", { method: "POST", body: { leadId: lead.id, items: [{ productId: p.id, qtyBoxes: 1 }] } }))).json()).quote;
    const q1 = await make();
    const q2 = await make();
    const res = await setStatus(req(`/api/crm/quotes/${q1.id}/status`, { method: "POST", body: { status: "sold" } }), ctx({ id: q1.id }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote).toMatchObject({ status: "sold", soldAt: NOW.toISOString() });
    expect(body.lead).toMatchObject({ id: lead.id, status: "customer", convertedAt: NOW.toISOString() });
    // The other open quote stays open.
    expect((await store.getQuote(SHOP, q2.id))?.status).toBe("draft");
    expect((await saveQuote(req(`/api/crm/quotes/${q1.id}`, { method: "PUT", body: { items: [{ productId: p.id, qtyBoxes: 5 }] } }), ctx({ id: q1.id }))).status).toBe(409);
    expect((await sendQuote(req(`/api/crm/quotes/${q1.id}/send`, { method: "POST" }), ctx({ id: q1.id }))).status).toBe(409);
    expect((await setStatus(req(`/api/crm/quotes/${q1.id}/status`, { method: "POST", body: { status: "lost" } }), ctx({ id: q1.id }))).status).toBe(409);
    const list = (await (await customers(req("/api/crm/customers"))).json()).customers;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: lead.id, spent: 1000_00 });
    expect(list[0].quotes).toHaveLength(2);
  });
});

describe("public quote", () => {
  async function sentQuote() {
    const p = await product();
    const a = await newLead("9876500001", "Asha Rao");
    const b = await newLead("9876500002", "Bala Krishna");
    const post = async (leadId: string, boxes: number) =>
      (await (await createQuote(req("/api/crm/quotes", { method: "POST", body: { leadId, items: [{ productId: p.id, areaSqft: 120 }, { productId: p.id, qtyBoxes: boxes }], notes: "Hall" } }))).json()).quote;
    const mine = await post(a.id, 1);
    await post(b.id, 5);
    return mine;
  }

  it("shows only that quote, with no ids, phone numbers or other quotes, and only with the link's key", async () => {
    const q = await sentQuote();
    const res = await publicQuote(req(`/api/crm/public/quotes/${q.number}?k=${q.publicKey}`, { cookie: null }), ctx({ number: q.number }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shop).toEqual({ name: "Kalyani Tiles & Sanitary", area: "Maddilapalem", city: "Visakhapatnam", phoneDisplay: "+91 73821 30063", hours: "Mon to Sat, 9:30 am to 8:30 pm" });
    expect(body.quote).toMatchObject({ number: "KT-0001", customerName: "Asha Rao", subtotal: 10000_00, total: 10000_00, notes: "Hall", expired: false });
    expect(body.quote.items).toEqual([
      { name: "Test Marble", brand: "Vitrano", sizeMm: "600x600", finish: "Glossy", qtyBoxes: 9, areaSqft: 120, wastagePct: 10, sqftCovered: 139.5, unitPrice: 1000_00, lineTotal: 9000_00 },
      { name: "Test Marble", brand: "Vitrano", sizeMm: "600x600", finish: "Glossy", qtyBoxes: 1, areaSqft: null, wastagePct: 10, sqftCovered: 15.5, unitPrice: 1000_00, lineTotal: 1000_00 },
    ]);
    const text = JSON.stringify(body);
    for (const leak of ["9876500001", "9876500002", "Bala", "KT-0002", q.id, q.leadId, q.publicKey, '"id"']) expect(text).not.toContain(leak);
  });

  it("answers the same 404 for a wrong key, no key and an unknown number, without a login", async () => {
    const q = await sentQuote();
    for (const url of [`/api/crm/public/quotes/${q.number}?k=wrong`, `/api/crm/public/quotes/${q.number}`, `/api/crm/public/quotes/KT-0099?k=${q.publicKey}`]) {
      const number = url.split("/").at(-1)!.split("?")[0];
      const res = await publicQuote(req(url, { cookie: null }), ctx({ number }));
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe("This quote link is not valid. Ask the showroom to send it again.");
    }
  });
});

describe("today and follow-ups", () => {
  it("counts the seeded shop and lists calls due today and overdue, oldest first", async () => {
    resetMemoryCrmStore({ seed: true });
    const res = await today(req("/api/crm/today"));
    const body = await res.json();
    expect(body.storage).toBe("memory");
    // Week from Monday 19 Oct: Lakshmi (2 days ago) and Anjali (today). Ravi and Fathima came in the week before.
    expect(body.counts).toMatchObject({ newLeadsThisWeek: 2, openQuotes: 3, soldThisMonth: 1, dueToday: 2 });
    expect(body.due.map((f: { lead: { name: string } }) => f.lead.name)).toEqual(["Fathima Begum", "Ravi Teja Varma"]);
    expect(body.due[1].quote).toMatchObject({ status: "sent" });
    expect(body.activity.length).toBeGreaterThan(3);
  });

  it("done closes a follow-up and counts as contact; snooze moves it 2 days", async () => {
    resetMemoryCrmStore({ seed: true });
    const { due } = await (await today(req("/api/crm/today"))).json();
    const [first, second] = due;
    const done = await patchFollowup(req(`/api/crm/followups/${first.id}`, { method: "PATCH", body: { action: "done", result: "Will visit Sunday" } }), ctx({ id: first.id }));
    expect((await done.json()).followup).toMatchObject({ doneAt: NOW.toISOString(), result: "Will visit Sunday" });
    expect((await store.getLead(SHOP, first.leadId))?.lastContactAt).toBe(NOW.toISOString());
    const snoozed = await patchFollowup(req(`/api/crm/followups/${second.id}`, { method: "PATCH", body: { action: "snooze" } }), ctx({ id: second.id }));
    expect((await snoozed.json()).followup.dueAt).toBe("2026-10-26T06:00:00.000Z");
    expect((await (await today(req("/api/crm/today"))).json()).due).toEqual([]);
    // A closed follow-up cannot be closed again.
    expect((await patchFollowup(req(`/api/crm/followups/${first.id}`, { method: "PATCH", body: { action: "done" } }), ctx({ id: first.id }))).status).toBe(404);
  });
});
