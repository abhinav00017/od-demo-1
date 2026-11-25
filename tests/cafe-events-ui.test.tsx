import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import CafeEnquiriesPage from "@/app/cafe/website/events/admin/page";
import { CAFE_ATTRIBUTION_KEY } from "@/demos/solstice-cafe/attribution";
import { EnquiriesAdmin } from "@/demos/solstice-cafe/EnquiriesAdmin";
import { EnquiryForm } from "@/demos/solstice-cafe/EnquiryForm";
import { venueById } from "@/demos/solstice-cafe/events";
import { CafeOgiBubble } from "@/demos/solstice-cafe/OgiBubble";
import { SolsticeSite } from "@/demos/solstice-cafe/SolsticeSite";
import { VenuePage } from "@/demos/solstice-cafe/VenuePage";
import { addDays, indiaToday } from "@/lib/cafeEvents/validation";

const courtyard = venueById("courtyard")!;

beforeAll(() => {
  // jsdom has <dialog> but not its modal methods.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  // Rendering a cafe page keeps a first touch in localStorage; each test starts without one.
  localStorage.clear();
});

type Handler = (init?: RequestInit) => [number, unknown];
function mockFetch(routes: Record<string, Handler>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const key = Object.keys(routes).find((k) => url === k || url.startsWith(`${k}/`) || url.startsWith(`${k}?`));
    const [status, body] = key ? routes[key](init) : [404, { ok: false }];
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  });
  return calls;
}

describe("Events on the cafe home page", () => {
  it("has an Events link in the nav and on phones, and a section with both venue cards", () => {
    render(<SolsticeSite hubHref="/cafe" />);
    const nav = screen.getByRole("navigation", { name: "Primary Navigation" });
    expect(within(nav).getByRole("link", { name: "Events" }).getAttribute("href")).toBe("#events");
    expect(screen.getAllByRole("link", { name: "Events" }).length).toBeGreaterThanOrEqual(2);
    const section = screen.getByRole("region", { name: "Host Your Celebration at Solstice" });
    expect(within(section).getByRole("link", { name: "The Courtyard" }).getAttribute("href")).toBe("/cafe/website/events/courtyard");
    expect(within(section).getByRole("link", { name: "The Conservatory" }).getAttribute("href")).toBe("/cafe/website/events/conservatory");
    expect(within(section).getByText("From ₹1,200 per guest")).toBeTruthy();
    expect(within(section).getByText("From ₹1,500 per guest")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cafe owner login" }).getAttribute("href")).toBe("/cafe/website/events/admin");
  });
});

describe("a venue page", () => {
  it("shows the venue, its price, what is included, the way back and the enquiry form", () => {
    render(<VenuePage venue={courtyard} hubHref="/cafe" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The Courtyard");
    expect(screen.getAllByText("From ₹1,200 per guest").length).toBeGreaterThan(0);
    expect(screen.getByText("Minimum 15 guests, so from ₹18,000")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to the cafe/ }).getAttribute("href")).toBe("/cafe/website#events");
    expect(screen.getByRole("link", { name: /Back to hub/ }).getAttribute("href")).toBe("/cafe");
    // Nav links go back to the home page's sections.
    const nav = screen.getByRole("navigation", { name: "Primary Navigation" });
    expect(within(nav).getByRole("link", { name: "Menu" }).getAttribute("href")).toBe("/cafe/website#menu");
    expect(screen.getByRole("heading", { level: 2, name: "What's included" })).toBeTruthy();
    expect(screen.getByRole("form", { name: "Enquiry for The Courtyard" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /The Conservatory/ }).getAttribute("href")).toBe("/cafe/website/events/conservatory");
  });

  it("opens the photo viewer from any photo; arrows and keys move through photos, and close shuts it", () => {
    render(<VenuePage venue={courtyard} hubHref="/cafe" />);
    const count = courtyard.photos.length;
    fireEvent.click(screen.getByRole("button", { name: `Open photo 2 of ${count}: ${courtyard.photos[1].alt}` }));
    const dialog = screen.getByRole("dialog", { name: "The Courtyard photos" });
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(within(dialog).getByText(`2 / ${count}`)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Next photo" }));
    expect(within(dialog).getByText(`3 / ${count}`)).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(within(dialog).getByText(`1 / ${count}`)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Previous photo" }));
    expect(within(dialog).getByText(`${count} / ${count}`)).toBeTruthy();
    expect(within(dialog).getByRole("img", { name: courtyard.photos[count - 1].alt })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close photos" }));
    expect(dialog.hasAttribute("open")).toBe(false);
  });
});

describe("the enquiry form", () => {
  it("checks every field in the browser before sending anything", async () => {
    const calls = mockFetch({});
    render(<EnquiryForm venue={courtyard} />);
    fireEvent.click(screen.getByRole("button", { name: /Send enquiry/ }));
    expect(await screen.findByText("Choose the type of event.")).toBeTruthy();
    expect(screen.getByText("Pick a date.")).toBeTruthy();
    expect(screen.getByText("Choose a time.")).toBeTruthy();
    expect(screen.getByText("Enter the number of guests.")).toBeTruthy();
    expect(screen.getByText("Enter your name.")).toBeTruthy();
    expect(screen.getByText("Enter your mobile number.")).toBeTruthy();
    expect(screen.getByLabelText("Your name").getAttribute("aria-invalid")).toBe("true");
    expect(calls).toEqual([]);

    fireEvent.change(screen.getByLabelText(/Number of guests/), { target: { value: "41" } });
    fireEvent.click(screen.getByRole("button", { name: /Send enquiry/ }));
    expect(await screen.findByText("The Courtyard takes 15 to 40 guests.")).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("sends a good enquiry and shows the thank-you with the reference", async () => {
    const calls = mockFetch({ "/api/cafe/enquiries": () => [201, { ok: true, reference: "EV-1A2B3C4D" }] });
    render(<EnquiryForm venue={courtyard} />);
    const date = addDays(indiaToday(), 10);
    fireEvent.click(screen.getByLabelText("Birthday"));
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: date } });
    fireEvent.click(screen.getByLabelText(/Evening/));
    fireEvent.change(screen.getByLabelText(/Number of guests/), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Asha Rao" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "98765 43210" } });
    fireEvent.click(screen.getByRole("button", { name: /Send enquiry/ }));

    expect(await screen.findByText("Thank you. Your enquiry is with us.")).toBeTruthy();
    expect(screen.getByText("EV-1A2B3C4D")).toBeTruthy();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/cafe/enquiries");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      venue: "courtyard",
      eventType: "birthday",
      date,
      slot: "evening",
      guests: 25,
      name: "Asha Rao",
      phone: "98765 43210",
      notes: "",
      company: "",
    });
  });

  it("shows the server's field errors and keeps what was typed", async () => {
    mockFetch({ "/api/cafe/enquiries": () => [400, { ok: false, error: "Pick today or a later date.", fieldErrors: { date: "Pick today or a later date." } }] });
    render(<EnquiryForm venue={courtyard} />);
    fireEvent.click(screen.getByLabelText("Birthday"));
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: addDays(indiaToday(), 3) } });
    fireEvent.click(screen.getByLabelText(/Evening/));
    fireEvent.change(screen.getByLabelText(/Number of guests/), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Asha Rao" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByRole("button", { name: /Send enquiry/ }));
    expect(await screen.findByText("Pick today or a later date.")).toBeTruthy();
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe("Asha Rao");
  });
});

describe("the owner's enquiry list", () => {
  const enquiry = {
    id: "0f8e2c1a-1111-4222-8333-444455556666",
    reference: "EV-0F8E2C1A",
    createdAt: "2026-11-25T06:00:00.000Z",
    cafeSlug: "solstice-cafe",
    venue: "conservatory",
    eventType: "small_function",
    date: "2026-12-20",
    slot: "brunch",
    guests: 12,
    name: "Meera Iyer",
    phone: "9876543210",
    notes: "Baby shower, pastel colours.",
    status: "new",
    statusUpdatedAt: null,
    source: "google_ads",
    campaign: "kitty-party-brunch",
    utm: { utm_source: "google", gclid: "x" },
    channel: "ogi",
    isDemo: false,
  };

  it("asks for the password first, with the dev hint only in development", async () => {
    mockFetch({ "/api/cafe/session": () => [200, { configured: true, devPassword: true, authed: false }] });
    render(<EnquiriesAdmin />);
    expect(await screen.findByRole("form", { name: "Cafe owner login" })).toBeTruthy();
    expect(screen.getByText("testpass")).toBeTruthy();
  });

  it("lists enquiries and saves a status change", async () => {
    const calls = mockFetch({
      "/api/cafe/session": () => [200, { configured: true, devPassword: false, authed: true }],
      "/api/cafe/admin/enquiries": (init) =>
        init?.method === "PATCH"
          ? [200, { ok: true, enquiry: { ...enquiry, status: "contacted" } }]
          : [200, { ok: true, today: "2026-11-25", storage: "postgres", enquiries: [enquiry] }],
    });
    render(<EnquiriesAdmin />);
    expect(await screen.findByText("Meera Iyer")).toBeTruthy();
    expect(screen.getByText(/The Conservatory · Small function/)).toBeTruthy();
    expect(screen.getByText("In 25 days")).toBeTruthy();
    expect(screen.getByText("Baby shower, pastel colours.")).toBeTruthy();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Status"), { target: { value: "contacted" } });
    });
    await waitFor(() => expect(screen.getByText("EV-0F8E2C1A is now contacted.")).toBeTruthy());
    const patch = calls.find((c) => c.init?.method === "PATCH")!;
    expect(patch.url).toBe(`/api/cafe/admin/enquiries/${enquiry.id}`);
    expect(JSON.parse(String(patch.init?.body))).toEqual({ status: "contacted" });
  });
});

describe("the owner's list: where enquiries come from", () => {
  const base = {
    reference: "EV-0F8E2C1A",
    createdAt: "2026-11-25T06:00:00.000Z",
    cafeSlug: "solstice-cafe",
    venue: "courtyard",
    eventType: "birthday",
    date: "2026-12-20",
    slot: "evening",
    guests: 20,
    phone: "9000025001",
    notes: "",
    status: "new",
    statusUpdatedAt: null,
    campaign: null,
    utm: null,
    isDemo: true,
  };
  const rows = [
    { ...base, id: "0f8e2c1a-1111-4222-8333-444455556661", name: "Sneha Reddy", source: "google_ads", channel: "ogi", campaign: "events-jubilee-hills" },
    { ...base, id: "0f8e2c1a-1111-4222-8333-444455556662", name: "Arjun Rao", source: "website", channel: "form" },
    { ...base, id: "0f8e2c1a-1111-4222-8333-444455556663", name: "Fatima Khan", source: "google_ads", channel: "form" },
  ];

  it("shows each enquiry's source and Ogi chip, counts per source, and filters by source or by Ogi", async () => {
    mockFetch({
      "/api/cafe/session": () => [200, { configured: true, devPassword: false, authed: true }],
      "/api/cafe/admin/enquiries": () => [200, { ok: true, today: "2026-11-25", storage: "memory", enquiries: rows, sources: { google_ads: 2, website: 1 }, viaOgi: 1 }],
    });
    render(<EnquiriesAdmin />);
    expect(await screen.findByText("Sneha Reddy")).toBeTruthy();
    const summary = screen.getByRole("region", { name: /Where enquiries come from/ });
    expect(within(summary).getByRole("button", { name: /Google Ads 2/ })).toBeTruthy();
    expect(within(summary).getByRole("button", { name: /Website 1/ })).toBeTruthy();
    expect(within(summary).getByRole("button", { name: /Sent via Ogi 1/ })).toBeTruthy();
    expect(screen.getAllByText("via Ogi")).toHaveLength(1);
    expect(screen.getByText("Campaign: events-jubilee-hills")).toBeTruthy();

    fireEvent.click(within(summary).getByRole("button", { name: /Google Ads 2/ }));
    expect(within(summary).getByRole("button", { name: /Google Ads 2/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Arjun Rao")).toBeNull();
    expect(screen.getByText("Fatima Khan")).toBeTruthy();

    fireEvent.click(within(summary).getByRole("button", { name: /Sent via Ogi 1/ }));
    expect(screen.queryByText("Fatima Khan")).toBeNull();
    expect(screen.getByText("Sneha Reddy")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "All (3)" }));
    expect(screen.getByText("Arjun Rao")).toBeTruthy();
  });
});

describe("Ogi on the cafe pages", () => {
  it("is on the home page and the venue pages, and not on the owner page", async () => {
    const { unmount } = render(<SolsticeSite hubHref="/cafe" />);
    expect(screen.getByRole("button", { name: /Chat with Ogi, the cafe's assistant/ })).toBeTruthy();
    unmount();
    const venue = render(<VenuePage venue={courtyard} hubHref="/cafe" />);
    expect(screen.getByRole("button", { name: /Chat with Ogi/ })).toBeTruthy();
    venue.unmount();
    mockFetch({ "/api/cafe/session": () => [200, { configured: true, devPassword: false, authed: false }] });
    render(<CafeEnquiriesPage />);
    expect(await screen.findByRole("form", { name: "Cafe owner login" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Chat with Ogi/ })).toBeNull();
  });

  it("keeps the visitor's first touch on a cafe page, under the cafe's own key", () => {
    window.history.replaceState(null, "", "/cafe/website/events/courtyard?utm_source=google&utm_medium=cpc&gclid=x");
    render(<VenuePage venue={courtyard} hubHref="/cafe" />);
    const kept = JSON.parse(localStorage.getItem(CAFE_ATTRIBUTION_KEY)!);
    expect(kept).toMatchObject({ source: "google_ads", utm: { gclid: "x", landing: "/cafe/website/events/courtyard" } });
    expect(localStorage.getItem("lotus_first_touch")).toBeNull();
    window.history.replaceState(null, "", "/");
  });

  it("the form sends the kept first touch with the enquiry", async () => {
    localStorage.setItem(CAFE_ATTRIBUTION_KEY, JSON.stringify({ source: "meta_ads", campaign: "birthday-garden", utm: { fbclid: "y" }, at: Date.now() }));
    const calls = mockFetch({ "/api/cafe/enquiries": () => [201, { ok: true, reference: "EV-1A2B3C4D" }] });
    render(<EnquiryForm venue={courtyard} />);
    fireEvent.click(screen.getByLabelText("Birthday"));
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: addDays(indiaToday(), 10) } });
    fireEvent.click(screen.getByLabelText(/Evening/));
    fireEvent.change(screen.getByLabelText(/Number of guests/), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Asha Rao" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "98765 43210" } });
    fireEvent.click(screen.getByRole("button", { name: /Send enquiry/ }));
    expect(await screen.findByText("Thank you. Your enquiry is with us.")).toBeTruthy();
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({ source: "meta_ads", campaign: "birthday-garden", utm: { fbclid: "y" } });
  });

  it("shows the server's enquiry summary, and Confirm sends only the token and the first touch", async () => {
    localStorage.setItem(CAFE_ATTRIBUTION_KEY, JSON.stringify({ source: "google_ads", campaign: null, utm: { gclid: "x" }, at: Date.now() }));
    const card = {
      kind: "event_enquiry",
      token: "signed.token",
      expiresAt: Date.now() + 60_000,
      note: "No payment now. The cafe calls you to confirm the final quote.",
      summary: { venue: "The Courtyard", event: "Birthday", day: "Sat, 12 Dec", time: "Evening, 7:30 – 10:30 PM", guests: "25", name: "Asha Rao", phone: "9876543210", notes: "" },
    };
    const calls = mockFetch({
      "/api/ogi/chat": (init) => (init?.method === "POST" ? [200, { ok: true, kind: "answer", reply: "Here's your event enquiry.", confirm: card }] : [200, { ok: true, awake: true, greeting: "Hi, I'm Ogi." }]),
      "/api/ogi/confirm": () => [201, { ok: true, ref: "EV-ABCD1234" }],
    });
    render(<CafeOgiBubble />);
    fireEvent.click(screen.getByRole("button", { name: /Chat with Ogi/ }));
    expect(await screen.findByText("Hi, I'm Ogi.")).toBeTruthy();
    expect(calls[0].url).toBe("/api/ogi/chat?page=solstice-cafe");
    fireEvent.change(screen.getByLabelText("Message Ogi"), { target: { value: "Book the courtyard for 25" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Your event enquiry")).toBeTruthy();
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ page: "solstice-cafe", messages: [{ role: "user", content: "Book the courtyard for 25" }] });
    expect(screen.getByText("The Courtyard")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/Enquiry sent. Your reference is EV-ABCD1234/)).toBeTruthy();
    expect(JSON.parse(String(calls[2].init?.body))).toEqual({ token: "signed.token", source: "google_ads", campaign: null, utm: { gclid: "x" } });
  });

  it("says Ogi is resting, with the cafe's WhatsApp, when there is no model", async () => {
    mockFetch({ "/api/ogi/chat": () => [200, { ok: true, awake: false, greeting: "Hi" }] });
    render(<CafeOgiBubble />);
    fireEvent.click(screen.getByRole("button", { name: /Chat with Ogi/ }));
    expect(await screen.findByText("Ogi is resting")).toBeTruthy();
    expect(screen.getByRole("link", { name: /WhatsApp the cafe/ }).getAttribute("href")).toBe("https://wa.me/917382130063");
  });
});
