import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShowSalsaSite } from "@/demos/showsalsa/ShowSalsaSite";
import {
  INITIAL_EVENTS,
  WHATSAPP_NUMBER,
  calculateCartTotals,
  checkoutError,
  filterEvents,
  isIndianMobile,
  listingMessage,
  type EventListing,
} from "@/demos/showsalsa/data";

function renderSite() {
  return render(<ShowSalsaSite hubHref="/ticketing-platform" />);
}

function openFirstEvent() {
  const grid = screen.getByTestId("event-cards-grid");
  fireEvent.click(within(grid).getAllByRole("button")[0]);
  return screen.getByRole("dialog", { name: INITIAL_EVENTS[0].title });
}

afterEach(() => vi.restoreAllMocks());

describe("ShowSalsa ticketing demo", () => {
  it("shows the demo bar, the hero and the section headings", () => {
    renderSite();
    expect(screen.getByText("onlydevs demo")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to hub/ }).getAttribute("href")).toBe("/ticketing-platform");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("DJ Kairav Live at Tidal Goa");
    expect(screen.getByRole("heading", { level: 2, name: "Newly Added & Trending" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Curated Exclusives" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Built for Sold-Out Arenas & Effortless Gate Operations" })).toBeTruthy();
  });

  it("renders one event card per event in the data, and the filters narrow the grid", () => {
    renderSite();
    const grid = screen.getByTestId("event-cards-grid");
    expect(within(grid).getAllByRole("article")).toHaveLength(INITIAL_EVENTS.length);
    for (const event of INITIAL_EVENTS) {
      expect(within(grid).getByRole("button", { name: `View details and book tickets for ${event.title}` })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("tab", { name: "Stand-Up Comedy" }));
    expect(within(screen.getByTestId("event-cards-grid")).getAllByRole("article")).toHaveLength(
      INITIAL_EVENTS.filter((e) => e.category === "Comedy").length,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset Filters" }));
    expect(within(screen.getByTestId("event-cards-grid")).getAllByRole("article")).toHaveLength(INITIAL_EVENTS.length);
  });

  it("checkout checks tickets and details, then issues a pass into My Passes", async () => {
    renderSite();
    expect(screen.getByRole("button", { name: "My Passes (1)" })).toBeTruthy();
    const drawer = openFirstEvent();
    const tier = INITIAL_EVENTS[0].tiers[0].name;
    const submit = within(drawer).getByRole("button", { name: /Proceed to Checkout/ });

    // No tickets.
    fireEvent.click(within(drawer).getByRole("button", { name: `Decrease quantity for ${tier}` }));
    fireEvent.click(within(drawer).getByRole("button", { name: "Select Tickets Above" }));
    expect(within(drawer).getByRole("alert").textContent).toMatch(/select at least 1 ticket/);
    fireEvent.click(within(drawer).getByRole("button", { name: `Increase quantity for ${tier}` }));

    // Missing name, then a bad email, then a bad phone.
    fireEvent.change(within(drawer).getByRole("textbox", { name: "Attendee Full Name" }), { target: { value: "  " } });
    fireEvent.click(submit);
    expect(within(drawer).getByRole("alert").textContent).toMatch(/enter your name, email, and WhatsApp/);
    fireEvent.change(within(drawer).getByRole("textbox", { name: "Attendee Full Name" }), { target: { value: "Riya Kapoor" } });
    fireEvent.change(within(drawer).getByRole("textbox", { name: "Attendee Email" }), { target: { value: "riya@" } });
    fireEvent.click(submit);
    expect(within(drawer).getByRole("alert").textContent).toMatch(/valid email/);
    fireEvent.change(within(drawer).getByRole("textbox", { name: "Attendee Email" }), { target: { value: "riya@example.com" } });
    fireEvent.change(within(drawer).getByRole("textbox", { name: "Attendee WhatsApp Number" }), { target: { value: "12345" } });
    fireEvent.click(submit);
    expect(within(drawer).getByRole("alert").textContent).toMatch(/10-digit Indian WhatsApp number/);

    fireEvent.change(within(drawer).getByRole("textbox", { name: "Attendee WhatsApp Number" }), { target: { value: "98765 43210" } });
    fireEvent.click(submit);
    const status = within(drawer).getByRole("status");
    expect(within(status).getByRole("heading", { name: "Booking Confirmed!" })).toBeTruthy();
    expect(status.textContent).toMatch(/SS-\d{6}/);
    expect(status.textContent).toMatch(/riya@example.com/);
    expect(screen.getByRole("button", { name: "My Passes (2)" })).toBeTruthy();

    fireEvent.click(within(status).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "My Passes (2)" }));
    const passes = within(screen.getByRole("dialog", { name: "My Passes & QR Wallet" })).getByRole("list", { name: "Booked passes" });
    expect(within(passes).getAllByRole("listitem")).toHaveLength(2);
    expect(within(passes).getAllByRole("listitem")[0].textContent).toContain(INITIAL_EVENTS[0].title);
  });

  it("List Your Event checks the form, then opens WhatsApp on the demo number with the details", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    renderSite();
    fireEvent.click(screen.getByRole("button", { name: /List Your Event/ }));
    const modal = screen.getByRole("dialog", { name: /List Your Event/ });
    fireEvent.click(within(modal).getByRole("button", { name: "Publish Live Event" }));
    expect(within(modal).getByRole("alert").textContent).toBe("Please enter Event Title, Venue Name, and Headliner Artist.");
    expect(open).not.toHaveBeenCalled();

    fireEvent.change(within(modal).getByLabelText("Event Title *"), { target: { value: "Rooftop Jazz Night" } });
    fireEvent.change(within(modal).getByLabelText("Venue Name *"), { target: { value: "Skyline Terrace" } });
    fireEvent.change(within(modal).getByLabelText("Headliner Artist / Host *"), { target: { value: "The Blue Notes" } });
    fireEvent.change(within(modal).getByLabelText("City *"), { target: { value: "Hyderabad" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Publish Live Event" }));

    expect(open).toHaveBeenCalledTimes(1);
    const href = String(open.mock.calls[0][0]);
    expect(href.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    const text = decodeURIComponent(href.split("?text=")[1]);
    expect(text).toContain("Event: Rooftop Jazz Night");
    expect(text).toContain("Venue: Skyline Terrace");
    expect(text).toContain("City: Hyderabad");
    // The listed event opens in the drawer and joins the grid.
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Rooftop Jazz Night" })).toBeTruthy());
    expect(within(screen.getByTestId("event-cards-grid")).getAllByRole("article")).toHaveLength(INITIAL_EVENTS.length + 1);
  });

  it("every image is local, goes through next/image and has alt text, drawers included", () => {
    const { container } = renderSite();
    openFirstEvent();
    const imgs = [...container.ownerDocument.querySelectorAll("img")];
    expect(imgs.length).toBeGreaterThanOrEqual(INITIAL_EVENTS.length + 5);
    for (const img of imgs) {
      expect(img.getAttribute("alt")?.trim()).toBeTruthy();
      expect(img.getAttribute("src")).not.toMatch(/unsplash\.com/);
      expect(img.getAttribute("src")).toMatch(/\/_next\/image\?url=%2Fdemos%2Fshowsalsa%2F/);
    }
    for (const event of INITIAL_EVENTS) {
      expect(event.image).toMatch(/^\/demos\/showsalsa\/[a-z0-9-]+\.jpg$/);
      for (const artist of event.lineup) expect(artist.avatar).toMatch(/^\/demos\/showsalsa\/portrait-\d{2}\.jpg$/);
    }
  });

  it("uses the demo phone number, never the export's", () => {
    const { container } = renderSite();
    openFirstEvent();
    const body = container.ownerDocument.body;
    expect((within(body).getByRole("textbox", { name: "Attendee WhatsApp Number" }) as HTMLInputElement).value).toBe("+91 73821 30063");
    expect(body.innerHTML).not.toMatch(/98201|9820144510|unsplash/i);
  });
});

describe("ShowSalsa data", () => {
  it("adds the 5% booking fee and GST on it, and applies promo codes", () => {
    const tiers = INITIAL_EVENTS[0].tiers;
    const plain = calculateCartTotals(tiers, { [tiers[1].id]: 2 });
    expect(plain).toMatchObject({ subtotal: 7998, bookingFee: 400, gstAmount: 72, grandTotal: 8470, totalTickets: 2 });
    expect(calculateCartTotals(tiers, { [tiers[1].id]: 2 }, "salsa10").discountAmount).toBe(800);
    expect(calculateCartTotals(tiers, { [tiers[1].id]: 2 }, "VIP500").discountAmount).toBe(500);
    expect(calculateCartTotals(tiers, {}).grandTotal).toBe(0);
  });

  it("checks Indian mobile numbers and the checkout details", () => {
    expect(isIndianMobile("+91 73821 30063")).toBe(true);
    expect(isIndianMobile("09876543210")).toBe(true);
    expect(isIndianMobile("12345 67890")).toBe(false);
    expect(checkoutError(1, { name: "A", email: "a@b.co", phone: "9876543210" })).toBeUndefined();
    expect(checkoutError(0, { name: "A", email: "a@b.co", phone: "9876543210" })).toMatch(/at least 1 ticket/);
  });

  it("filters by city, category, date and search", () => {
    const all = { city: "All Cities", category: "All", dateFilter: "Any", searchQuery: "" } as const;
    expect(filterEvents(INITIAL_EVENTS, all)).toHaveLength(INITIAL_EVENTS.length);
    expect(filterEvents(INITIAL_EVENTS, { ...all, city: "Goa" }).every((e) => e.city === "Goa")).toBe(true);
    expect(filterEvents(INITIAL_EVENTS, { ...all, searchQuery: "kairav" }).map((e) => e.id)).toContain("evt-kairav-goa");
    expect(filterEvents(INITIAL_EVENTS, { ...all, searchQuery: "no such show" })).toHaveLength(0);
  });

  it("writes the listing message with every detail", () => {
    const listing: EventListing = {
      title: "Rooftop Jazz Night",
      subtitle: "",
      city: "Pune",
      category: "Music & Gigs",
      venue: "Skyline Terrace",
      dateLabel: "7 Nov",
      timeLabel: "08:00 PM",
      startingPrice: "1299",
      artistName: "The Blue Notes",
    };
    expect(listingMessage(listing)).toBe(
      [
        "Hi ShowSalsa, I want to list an event.",
        "Event: Rooftop Jazz Night",
        "Headliner / host: The Blue Notes",
        "Category: Music & Gigs",
        "City: Pune",
        "Venue: Skyline Terrace",
        "Date: 7 Nov, 08:00 PM",
        "Early bird price: ₹1,299",
      ].join("\n"),
    );
  });
});
