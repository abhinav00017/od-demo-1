import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sky49Site } from "@/demos/sky49/Sky49Site";
import {
  EMAIL,
  NAV_LINKS,
  PHONE_TEL,
  WHATSAPP_NUMBER,
  contactErrors,
  contactMessage,
  eoiErrors,
  eoiMessage,
  faqItems,
  floorPlanRows,
  site,
  whatsAppHref,
} from "@/demos/sky49/data";

const DEMO_WA = "https://wa.me/917382130063";
/** The original site's contacts. None may appear anywhere on the demo. */
const REAL = /7207456767|72074 56767|thesky49\.com/;

function renderSite() {
  return render(<Sky49Site hubHref="/real-estate" />);
}

afterEach(() => vi.restoreAllMocks());

describe("Sky49 real estate demo", () => {
  it("shows the demo bar and the hero", () => {
    renderSite();
    expect(screen.getByText("onlydevs demo")).toBeTruthy();
    expect(screen.getByText(/a client site rebuilt to show the website we build/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to hub/ }).getAttribute("href")).toBe("/real-estate");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Sky49 Tellapur Luxury 3 & 4 BHK Apartments");
    expect(screen.getByText("Osman Nagar, Hyderabad • G+49 Landmark Towers")).toBeTruthy();
    expect(screen.getByText("Request a EOI")).toBeTruthy();
  });

  it("renders the sections in the original order", () => {
    renderSite();
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([
      "Tellapur — Sky49 Hyderabad",
      "Sky49 Hyderabad: luxury living with long-term location value",
      "Why buyers shortlist Sky49 Tellapur",
      "See Your Future Home Taking Shape",
      "Enter Before theAddress Appreciates",
      "Built for Investors Evaluating Long-Term Value",
      "Empowering Your Decision for a Refined Dream Living",
      "Site Plan",
      "Why Sky49",
      "Experience the Lifestyle Before You Live It",
      "Sky49 specifications with practical clarity",
      "Amenities at Sky49 Hyderabad",
      "Sky49 location & proximity",
      "Frequently Asked Questions",
      "Book a site visit — Sky49 Hyderabad",
    ]);
  });

  it("shows the four project stats", () => {
    renderSite();
    const stats = screen.getByRole("region", { name: "Project statistics" });
    for (const [value, label] of [
      ["G+49", "Floors"],
      ["4", "Towers"],
      ["1 lakh+ sq ft", "Amenities"],
      ["RERA approved", "Compliance"],
    ]) {
      expect(within(stats).getByText(value)).toBeTruthy();
      expect(within(stats).getByText(label)).toBeTruthy();
    }
  });

  it("lists the master plan and the four tower floor plans", () => {
    const { container } = renderSite();
    const section = container.querySelector("#floor-plans")!;
    expect(within(section as HTMLElement).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
      floorPlanRows.map((r) => r.name),
    );
    expect(floorPlanRows.map((r) => r.name)).toEqual([
      "Master Plan",
      "Tower - A Floor Plan",
      "Tower - B Floor Plan",
      "Tower - C Floor Plan",
      "Tower - D Floor Plan",
    ]);
  });

  it("has all 10 FAQs as one-open-at-a-time details, the first one open", () => {
    const { container } = renderSite();
    const details = [...container.querySelectorAll<HTMLDetailsElement>("#faq details")];
    expect(details).toHaveLength(10);
    expect(details.map((d) => d.querySelector("summary")!.textContent)).toEqual(faqItems.map((f) => f.question));
    expect(details.every((d) => d.getAttribute("name") === "sky49-faq")).toBe(true);
    expect(details.map((d) => d.open)).toEqual([true, false, false, false, false, false, false, false, false, false]);
  });

  it("has an in-page target for every nav link and every # link", () => {
    const { container } = renderSite();
    for (const l of NAV_LINKS) expect(container.querySelector(l.href)).toBeTruthy();
    for (const a of container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      expect(container.querySelector(a.getAttribute("href")!), a.getAttribute("href")!).toBeTruthy();
    }
  });

  it("every WhatsApp, phone and email link uses the demo contacts, and the real ones appear nowhere", () => {
    const { container } = renderSite();
    // Open the mobile menu so its Call link is in the page too.
    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    const doc = container.ownerDocument;
    const wa = [...doc.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"], a[href*="whatsapp"]')];
    const tel = [...doc.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]')];
    const mail = [...doc.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]')];
    expect(wa.length).toBeGreaterThanOrEqual(2);
    expect(tel.length).toBeGreaterThanOrEqual(4);
    expect(mail.length).toBeGreaterThanOrEqual(1);
    for (const a of wa) expect(a.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/917382130063(\?|$)/);
    for (const a of tel) expect(a.getAttribute("href")).toBe("tel:+917382130063");
    for (const a of mail) expect(a.getAttribute("href")).toBe("mailto:hello@onlydevs.in");
    expect(doc.body.innerHTML).not.toMatch(REAL);
    expect(doc.body.textContent).toContain("+91 73821 30063");
    expect(doc.body.textContent).toContain("hello@onlydevs.in");
  });

  it("every image has alt text and goes through next/image", () => {
    const { container } = renderSite();
    const imgs = [...container.querySelectorAll("img")];
    expect(imgs.length).toBeGreaterThanOrEqual(25);
    for (const img of imgs) {
      expect(img.getAttribute("alt")?.trim()).toBeTruthy();
      // next/image rewrites src to its optimizer; a raw <img> would keep the plain public path.
      expect(img.getAttribute("src")).toMatch(/\/_next\/image\?url=%2Fdemos%2Fsky49%2F[a-z0-9-]+\.jpg/);
    }
  });

  it("the walkthrough loads YouTube only after play is pressed", () => {
    const { container } = renderSite();
    expect(container.querySelector('iframe[src*="youtube"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Play video/ }));
    const frame = container.querySelector<HTMLIFrameElement>('iframe[src*="youtube"]');
    expect(frame?.getAttribute("src")).toContain(`/embed/${site.youtubeWalkthroughId}?autoplay=1`);
  });

  it("keeps the Google Maps embed from the original site", () => {
    const { container } = renderSite();
    expect(container.querySelector("#location iframe")?.getAttribute("src")).toBe(site.mapEmbedSrc);
  });

  it("the mobile menu opens with every section link and closes on a link tap", () => {
    renderSite();
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const menu = screen.getByRole("navigation", { name: "Mobile" });
    expect(within(menu).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([...NAV_LINKS.map((l) => l.href), "#contact"]);
    fireEvent.click(within(menu).getByRole("link", { name: "FAQ" }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("the hero EOI form checks name and mobile, then opens WhatsApp with the request", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    renderSite();
    const form = screen.getByRole("form", { name: "Hero mini phone form" });
    fireEvent.click(within(form).getByRole("button", { name: "Register EOI Now" }));
    expect(within(form).getByText("Enter your name.")).toBeTruthy();
    expect(within(form).getByText("Enter your phone number.")).toBeTruthy();
    expect(open).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "Meera" } });
    fireEvent.change(within(form).getByLabelText("Phone Number"), { target: { value: "12345" } });
    fireEvent.click(within(form).getByRole("button", { name: "Register EOI Now" }));
    expect(within(form).getByText("Enter a 10-digit Indian mobile number.")).toBeTruthy();
    expect(within(form).getByLabelText("Phone Number").getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(within(form).getByLabelText("Phone Number"), { target: { value: "+91 98765 43210" } });
    fireEvent.click(within(form).getByRole("button", { name: "Register EOI Now" }));
    expect(open).toHaveBeenCalledTimes(1);
    const href = open.mock.calls[0][0] as string;
    expect(href.startsWith(`${DEMO_WA}?text=`)).toBe(true);
    const text = new URL(href).searchParams.get("text")!;
    expect(text).toContain("Name: Meera");
    expect(text).toContain("Phone: +91 98765 43210");
    expect(screen.getByText("Your EOI is ready on WhatsApp.")).toBeTruthy();
  });

  it("the site visit form checks every required field, then opens WhatsApp with the request", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    renderSite();
    const form = screen.getByRole("form", { name: "Book a site visit" });
    const submit = within(form).getByRole("button", { name: "Register EOI Now" });
    fireEvent.click(submit);
    for (const msg of ["Enter your first name.", "Enter your email.", "Enter your phone number.", "Select a residence type."]) {
      expect(within(form).getByText(msg)).toBeTruthy();
    }
    expect(open).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByLabelText("First name"), { target: { value: "Ravi" } });
    fireEvent.change(within(form).getByLabelText("Email"), { target: { value: "ravi@" } });
    fireEvent.change(within(form).getByLabelText("Phone"), { target: { value: "9876543210" } });
    fireEvent.change(within(form).getByLabelText("Interested in"), { target: { value: "4 BHK premium" } });
    fireEvent.click(submit);
    expect(within(form).getByText("Enter a valid email address.")).toBeTruthy();
    expect(open).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByLabelText("Email"), { target: { value: "ravi@example.com" } });
    fireEvent.click(within(form).getByLabelText("Send me the digital brochure"));
    fireEvent.click(submit);
    expect(open).toHaveBeenCalledTimes(1);
    const href = open.mock.calls[0][0] as string;
    expect(href.startsWith(`${DEMO_WA}?text=`)).toBe(true);
    const text = new URL(href).searchParams.get("text")!;
    expect(text).toContain("Interested in: 4 BHK premium");
    expect(text).toContain("Please send me the digital brochure.");
    expect(screen.getByText("Thank you")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open WhatsApp again" }).getAttribute("href")).toBe(href);
  });

  it("the footer keeps the RERA wording and says it is a demo", () => {
    const { container } = renderSite();
    const footer = container.querySelector("footer")!;
    expect(footer.textContent).toContain("Telangana RERA — verify registration ID on the official portal");
    expect(footer.textContent).toContain("Demo site by onlydevs. Details for illustration.");
    expect(footer.querySelector('a[href*="privacy"], a[href*="terms"]')).toBeNull();
  });
});

describe("Sky49 data", () => {
  it("builds every contact link from the demo constants", () => {
    expect(WHATSAPP_NUMBER).toBe("917382130063");
    expect(PHONE_TEL).toBe("+917382130063");
    expect(EMAIL).toBe("hello@onlydevs.in");
    expect(whatsAppHref()).toBe(DEMO_WA);
    expect(whatsAppHref("Hi & bye")).toBe(`${DEMO_WA}?text=Hi%20%26%20bye`);
  });

  it("checks the EOI and contact forms", () => {
    expect(eoiErrors({ name: " ", phone: "" })).toEqual({ name: "Enter your name.", phone: "Enter your phone number." });
    expect(eoiErrors({ name: "Meera", phone: "919876543210" })).toEqual({});
    expect(eoiMessage({ name: " Meera ", phone: "9876543210" })).toBe("Hello Sky49! I would like to register an EOI.\nName: Meera\nPhone: 9876543210");
    const ok = {
      firstName: "Ravi",
      lastName: "",
      email: "ravi@example.com",
      phone: "9876543210",
      interest: "3 BHK luxury",
      message: "",
      wantsBrochure: false,
    };
    expect(contactErrors(ok)).toEqual({});
    expect(contactErrors({ ...ok, phone: "5876543210" })).toEqual({ phone: "Enter a 10-digit Indian mobile number." });
    expect(contactMessage(ok)).toBe(
      "Hello Sky49! I would like to book a site visit.\nName: Ravi\nEmail: ravi@example.com\nPhone: 9876543210\nInterested in: 3 BHK luxury",
    );
  });
});
