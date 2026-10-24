import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmApp } from "@/demos/tiles-crm/CrmApp";
import { matchesLead } from "@/demos/tiles-crm/Leads";
import { sqftFromSize } from "@/demos/tiles-crm/Products";
import { PublicQuote, QuoteSheet, type PublicQuoteData } from "@/demos/tiles-crm/PublicQuote";
import { lineBoxesOf, QuoteBuilder } from "@/demos/tiles-crm/QuoteBuilder";
import { readView, viewQuery } from "@/demos/tiles-crm/nav";
import type { Lead, Product } from "@/lib/crm/types";

const nav = vi.hoisted(() => ({ params: { number: "KT-0007" } as Record<string, string>, search: new URLSearchParams("k=abc") }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useParams: () => nav.params,
  useSearchParams: () => nav.search,
}));

/** fetch that answers by path. Unknown paths answer 404. */
function stubFetch(routes: Record<string, (init?: RequestInit) => [number, unknown]>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const path = url.split("?")[0];
    const [status, body] = routes[path]?.(init) ?? [404, { ok: false, error: "not found" }];
    return new Response(JSON.stringify(body), { status });
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  nav.search = new URLSearchParams("k=abc");
});

const sheet: PublicQuoteData = {
  shop: { name: "Kalyani Tiles & Sanitary", area: "Maddilapalem", city: "Visakhapatnam", phoneDisplay: "+91 73821 30063", hours: "Mon to Sat, 9:30 am to 8:30 pm" },
  quote: {
    number: "KT-0007",
    status: "sent",
    date: "2026-10-24T06:00:00.000Z",
    validUntil: "2026-10-31T06:00:00.000Z",
    expired: false,
    customerName: "Asha Rao",
    subtotal: 10000_00,
    discount: 500_00,
    total: 9500_00,
    notes: "Delivery on Monday",
    items: [{ name: "Carrara Gloss", brand: "Vitrano", sizeMm: "600x600", finish: "Glossy", qtyBoxes: 9, areaSqft: 120, wastagePct: 10, sqftCovered: 139.5, unitPrice: 1000_00, lineTotal: 9000_00 }],
  },
};

describe("public quote page", () => {
  it("prints the shop, the customer, each line with boxes and coverage, and the totals", () => {
    render(<QuoteSheet data={sheet} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("KT-0007");
    expect(screen.getByText("Kalyani Tiles & Sanitary")).toBeTruthy();
    expect(screen.getByText("Asha Rao")).toBeTruthy();
    const row = screen.getByRole("row", { name: /Carrara Gloss/ });
    expect(within(row).getByText("9")).toBeTruthy();
    expect(within(row).getByText("139.5 sq ft")).toBeTruthy();
    expect(within(row).getByText("For 120 sq ft + 10% wastage")).toBeTruthy();
    expect(screen.getByText("−₹500")).toBeTruthy();
    expect(screen.getByText("₹9,500")).toBeTruthy();
    expect(screen.getByText(/Valid until 31 October 2026/)).toBeTruthy();
    expect(screen.getByText(/made-up showroom/)).toBeTruthy();
  });

  it("loads the quote with the number and key from the link, and prints on the button", async () => {
    const calls = stubFetch({ "/api/crm/public/quotes/KT-0007": () => [200, { ok: true, ...sheet }] });
    const print = vi.fn();
    vi.stubGlobal("print", print);
    render(<PublicQuote />);
    await screen.findByRole("heading", { level: 1, name: "KT-0007" });
    expect(calls[0].url).toBe("/api/crm/public/quotes/KT-0007?k=abc");
    fireEvent.click(screen.getByRole("button", { name: "Print / Save as PDF" }));
    expect(print).toHaveBeenCalled();
  });

  it("says the link is not valid when the API refuses it", async () => {
    nav.search = new URLSearchParams("k=wrong");
    stubFetch({ "/api/crm/public/quotes/KT-0007": () => [404, { ok: false, error: "This quote link is not valid. Ask the showroom to send it again." }] });
    render(<PublicQuote />);
    expect((await screen.findByRole("alert")).textContent).toBe("This quote link is not valid. Ask the showroom to send it again.");
  });
});

describe("CRM login", () => {
  it("shows the demo password hint in development, and the error for a wrong password", async () => {
    stubFetch({
      "/api/crm/session": () => [200, { configured: true, devPassword: true, authed: false }],
      "/api/crm/login": () => [401, { ok: false, error: "Wrong password." }],
    });
    render(<CrmApp />);
    await screen.findByRole("form", { name: "CRM login" });
    expect(screen.getByText("demo")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Wrong password.");
  });

  it("opens Today once logged in", async () => {
    nav.search = new URLSearchParams("");
    stubFetch({
      "/api/crm/session": () => [200, { configured: true, devPassword: false, authed: true }],
      "/api/crm/today": () => [
        200,
        {
          ok: true,
          today: "2026-10-24",
          storage: "memory",
          counts: { newLeadsThisWeek: 2, openQuotes: 3, soldThisMonth: 1, soldValueThisMonth: 4200000, dueToday: 0 },
          due: [],
          activity: [],
        },
      ],
    });
    render(<CrmApp />);
    expect(await screen.findByRole("heading", { level: 1, name: "Today" })).toBeTruthy();
    expect(screen.getByText("this month · ₹42,000")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Today" }).getAttribute("aria-current")).toBe("page");
  });
});

const product: Product = {
  id: "p1",
  shopSlug: "kalyani-tiles",
  sku: "KT-F601",
  name: "Carrara Gloss",
  brand: "Vitrano",
  category: "floor",
  sizeMm: "600x600",
  finish: "Glossy",
  pricePerBox: 1085_00,
  sqftPerBox: 15.5,
  piecesPerBox: 4,
  imageUrl: null,
  active: true,
  createdAt: "2026-10-01T00:00:00.000Z",
};
const lead: Lead = {
  id: "l1",
  shopSlug: "kalyani-tiles",
  name: "Asha Rao",
  phone: "9876500001",
  status: "lead",
  source: "walk-in",
  notes: "",
  nextFollowUpAt: null,
  lastContactAt: "2026-10-24T00:00:00.000Z",
  createdAt: "2026-10-24T00:00:00.000Z",
  convertedAt: null,
};

describe("quote builder", () => {
  it("adds a product by search, turns a room area into boxes, and totals with the discount", async () => {
    stubFetch({
      "/api/crm/products": () => [200, { ok: true, products: [product, { ...product, id: "p2", name: "Old Tile", active: false }] }],
      "/api/crm/leads/l1": () => [200, { ok: true, lead, quotes: [], followups: [], messages: [] }],
    });
    render(<QuoteBuilder leadId="l1" />);
    const search = await screen.findByLabelText("Add a product");
    fireEvent.change(search, { target: { value: "gloss" } });
    const results = screen.getByRole("list", { name: "Matching products" });
    // Inactive products are not offered.
    expect(within(results).queryByText("Old Tile")).toBeNull();
    fireEvent.click(within(results).getByText("Carrara Gloss"));
    const line = screen.getByRole("list", { name: "Quote lines" });
    expect(within(line).getByText("1 box")).toBeTruthy();
    fireEvent.click(within(line).getByRole("button", { name: "Area (sq ft)" }));
    fireEvent.change(within(line).getByLabelText("Area, sq ft"), { target: { value: "120" } });
    // 120 sq ft + 10% = 132; 132 / 15.5 -> 9 boxes.
    expect(within(line).getByText("9 boxes")).toBeTruthy();
    expect(within(line).getByText(/covers 139.5 sq ft · needs 132 sq ft with wastage/)).toBeTruthy();
    expect(within(line).getByText("₹9,765")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Discount, ₹"), { target: { value: "265" } });
    const total = screen.getByRole("complementary", { name: "Quote total" });
    expect(within(total).getByText("₹9,500")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Discount, ₹"), { target: { value: "20000" } });
    expect(within(total).getByText("The discount is more than the quote.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Send on WhatsApp" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("screen helpers", () => {
  it("works out boxes for a typed line", () => {
    expect(lineBoxesOf({ mode: "area", qty: "1", area: "100", wastage: "10" }, 11)).toBe(10);
    expect(lineBoxesOf({ mode: "boxes", qty: "3.6", area: "", wastage: "10" }, 11)).toBe(3);
    expect(lineBoxesOf({ mode: "boxes", qty: "", area: "", wastage: "10" }, 11)).toBe(0);
  });

  it("matches leads by name or 3+ digits of the number", () => {
    const l = { name: "Asha Rao", phone: "9876500001" };
    expect(matchesLead(l, "asha")).toBe(true);
    expect(matchesLead(l, "98765 0")).toBe(true);
    expect(matchesLead(l, "98")).toBe(false);
    expect(matchesLead(l, "")).toBe(true);
  });

  it("suggests sq ft per box from the size and pieces", () => {
    expect(sqftFromSize("600x600", 4)).toBe(15.5);
    expect(sqftFromSize("800 x 1600", 2)).toBe(27.56);
    expect(sqftFromSize("big", 4)).toBeNull();
  });

  it("keeps the screen in the query string", () => {
    expect(readView(new URLSearchParams("v=lead&id=abc"))).toEqual({ v: "lead", id: "abc" });
    expect(readView(new URLSearchParams("v=lead"))).toEqual({ v: "leads" });
    expect(readView(new URLSearchParams("v=quote&lead=l1"))).toEqual({ v: "quote", id: undefined, lead: "l1" });
    expect(readView(new URLSearchParams("v=nope"))).toEqual({ v: "today" });
    expect(viewQuery({ v: "quote", lead: "l1" })).toBe("?v=quote&lead=l1");
    expect(viewQuery({ v: "today" })).toBe("");
  });
});
