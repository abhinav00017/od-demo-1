import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SolsticeSite } from "@/demos/solstice-cafe/SolsticeSite";
import {
  MENU_ITEMS,
  WHATSAPP_NUMBER,
  isIndianMobile,
  orderMessage,
  reservationErrors,
  reservationMessage,
  whatsAppHref,
} from "@/demos/solstice-cafe/data";

const DEMO_WA = "https://wa.me/917382130063";

function renderSite() {
  return render(<SolsticeSite hubHref="/cafe" />);
}

afterEach(() => vi.restoreAllMocks());

describe("Solstice cafe demo", () => {
  it("shows the demo bar, the hero and the section headings", () => {
    renderSite();
    expect(screen.getByText("onlydevs demo")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to hub/ }).getAttribute("href")).toBe("/cafe");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The Freshest Brews in Jubilee Hills");
    expect(screen.getByRole("heading", { level: 2, name: "Elevated Hyderabadi Classics & Single-Origin Brews" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Limestone, Dappled Neem Light & Analog Warmth" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Plot 284, Road No. 45, Jubilee Hills" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Reserve a Sunlit Courtyard Table" })).toBeTruthy();
  });

  it("has in-page anchors for every nav link", () => {
    const { container } = renderSite();
    const nav = screen.getByRole("navigation", { name: "Primary Navigation" });
    for (const a of within(nav).getAllByRole("link")) {
      const id = a.getAttribute("href")!.slice(1);
      expect(container.querySelector(`#${id}`)).toBeTruthy();
    }
  });

  it("lists all 12 menu items, and the filters narrow the grid", () => {
    renderSite();
    const names = MENU_ITEMS.map((i) => i.name);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(expect.arrayContaining(names));
    fireEvent.click(screen.getByRole("tab", { name: "Artisanal Irani Chai" }));
    expect(screen.getByRole("tab", { name: "Artisanal Irani Chai" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("heading", { level: 3, name: "Araku Honey-Process V60" })).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Charminar Saffron Irani Chai" })).toBeTruthy();
  });

  it("every image has alt text and goes through next/image", () => {
    const { container } = renderSite();
    const imgs = [...container.querySelectorAll("img")];
    expect(imgs.length).toBeGreaterThanOrEqual(16);
    for (const img of imgs) {
      expect(img.getAttribute("alt")?.trim()).toBeTruthy();
      // next/image rewrites src to its optimizer; a raw <img> would keep the plain public path.
      expect(img.getAttribute("src")).toMatch(/\/_next\/image\?url=%2Fdemos%2Fsolstice%2F/);
    }
  });

  it("every WhatsApp link goes to the demo number", () => {
    const { container } = renderSite();
    fireEvent.click(screen.getAllByRole("button", { name: /Order on WhatsApp/ })[0]);
    const wa = [...container.ownerDocument.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"], a[href*="whatsapp"]')];
    expect(wa.length).toBeGreaterThanOrEqual(2);
    for (const a of wa) expect(a.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/917382130063(\?|$)/);
    expect(container.ownerDocument.body.textContent).not.toMatch(/98490 45284|2355 8490/);
  });

  it("the order tray sends the cart to WhatsApp and updates with the menu", () => {
    renderSite();
    expect(screen.getAllByText("(2)").length).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity of Araku Honey-Process V60" }));
    expect(screen.getByText("(3)")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /Order on WhatsApp/ })[0]);
    const tray = screen.getByRole("complementary", { name: "WhatsApp Order Tray" });
    const send = within(tray).getByRole("link", { name: /Send Order to Solstice WhatsApp/ });
    const text = new URL(send.getAttribute("href")!).searchParams.get("text")!;
    expect(text).toContain("• 2x Araku Honey-Process V60 — ₹680");
    expect(text).toContain("• 1x Classic Osmania Butter Croissant — ₹290");
    expect(text).toContain("Total: ₹970");
    fireEvent.keyDown(window, { key: "Escape" });
  });

  it("the reservation form checks the mobile number, then opens WhatsApp with the request", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    renderSite();
    fireEvent.click(screen.getByRole("button", { name: /Confirm Courtyard Table/ }));
    expect(screen.getByText("Enter your mobile number.")).toBeTruthy();
    expect(open).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Mobile Number/), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Courtyard Table/ }));
    expect(screen.getByText("Enter a 10-digit Indian mobile number.")).toBeTruthy();
    expect(screen.getByLabelText(/Mobile Number/).getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(screen.getByLabelText(/Mobile Number/), { target: { value: "+91 98765 43210" } });
    fireEvent.change(screen.getByLabelText("Party Size"), { target: { value: "4 Guests" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Courtyard Table/ }));
    expect(open).toHaveBeenCalledTimes(1);
    const href = open.mock.calls[0][0] as string;
    expect(href.startsWith(`${DEMO_WA}?text=`)).toBe(true);
    const text = new URL(href).searchParams.get("text")!;
    expect(text).toContain("Party: 4 Guests");
    expect(text).toContain("Mobile: +91 98765 43210");
    expect(screen.getByText("Reservation Request Ready on WhatsApp")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open WhatsApp again" }).getAttribute("href")).toBe(href);
  });
});

describe("Solstice data", () => {
  it("builds wa.me links from the one demo number", () => {
    expect(WHATSAPP_NUMBER).toBe("917382130063");
    expect(whatsAppHref()).toBe(DEMO_WA);
    expect(whatsAppHref("Hi & bye")).toBe(`${DEMO_WA}?text=Hi%20%26%20bye`);
  });

  it("checks Indian mobile numbers", () => {
    for (const ok of ["9876543210", "+91 98765 43210", "919876543210", "098765-43210"]) expect(isIndianMobile(ok)).toBe(true);
    for (const bad of ["", "12345", "5876543210", "+1 415 555 0100", "98765432101"]) expect(isIndianMobile(bad)).toBe(false);
  });

  it("rejects a past date", () => {
    const r = { date: "2026-10-20", time: "09:00 AM", guests: "2 Guests", phone: "9876543210" };
    expect(reservationErrors(r, "2026-10-24")).toEqual({ date: "Pick today or a later date." });
    expect(reservationErrors({ ...r, date: "2026-10-24" }, "2026-10-24")).toEqual({});
    expect(reservationMessage(r)).toContain("Date: 2026-10-20");
  });

  it("writes the order message as the original site did (its filter drops the blank lines)", () => {
    const item = MENU_ITEMS[0];
    expect(orderMessage([{ item, qty: 2 }], "Courtyard Pickup", "  Rohan ")).toBe(
      `Hello Solstice Jubilee Hills! I would like to place an order (Courtyard Pickup):\n• 2x ${item.name} — ₹${item.price * 2}\nTotal: ₹${item.price * 2}\nName: Rohan`,
    );
  });
});
