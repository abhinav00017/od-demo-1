import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VerdantCrestSite } from "@/demos/verdant-crest/VerdantCrestSite";
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
} from "@/demos/verdant-crest/data";

const DEMO_WA = "https://wa.me/917382130063";
/**
 * Guards against the real project this layout came from. The patterns are stored base64-encoded so a repo-wide grep for
 * the real names stays at zero hits. Decoded, REAL is the original phone and domain; REAL_PROJECT is the project and
 * builder names, the old YouTube id, the street area, PIN code, coordinates, the old floor count, prices and amenity area.
 */
const decode = (b64: string) => new RegExp(Buffer.from(b64, "base64").toString("utf8"), "i");
const REAL = decode("NzIwNzQ1Njc2N3w3MjA3NCA1Njc2N3x0aGVza3k0OVwuY29t");
const REAL_PROJECT = decode("c2t5ID80OXxza3ktNDl8YW5hbmRhfHByb3NwZXJ8STVEYmlVa1QwNU18b3NtYW58NTAyMDMyfDE3XC40NDR8NzhcLjI3NXxHXCs0OXw3LDE5OXwxMSwwMDB8MSBsYWto");

function renderSite() {
  return render(<VerdantCrestSite hubHref="/real-estate" />);
}

afterEach(() => vi.restoreAllMocks());

describe("Verdant Crest real estate demo", () => {
  it("shows the demo bar and the hero", () => {
    renderSite();
    expect(screen.getByText("onlydevs demo")).toBeTruthy();
    expect(screen.getByText(/a made-up developer site to show the website we build/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to hub/ }).getAttribute("href")).toBe("/real-estate");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Verdant Crest Tellapur Luxury 3 & 4 BHK Apartments");
    expect(screen.getByText("Tellapur, Hyderabad • G+42 Landmark Towers")).toBeTruthy();
    expect(screen.getByText("Request a EOI")).toBeTruthy();
  });

  it("renders the sections in order, with no walkthrough video", () => {
    renderSite();
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([
      "Verdant Crest: luxury living with long-term location value",
      "Why buyers shortlist Verdant Crest",
      "See Your Future Home Taking Shape",
      "Enter Before theAddress Appreciates",
      "Built for Investors Evaluating Long-Term Value",
      "Empowering Your Decision for a Refined Dream Living",
      "Site Plan",
      "Why Verdant Crest",
      "Experience the Lifestyle Before You Live It",
      "Verdant Crest specifications with practical clarity",
      "Amenities at Verdant Crest",
      "Verdant Crest location & proximity",
      "Frequently Asked Questions",
      "Book a site visit — Verdant Crest",
    ]);
  });

  it("shows the four project stats", () => {
    renderSite();
    const stats = screen.getByRole("region", { name: "Project statistics" });
    for (const [value, label] of [
      ["G+42", "Floors"],
      ["4", "Towers"],
      ["85,000 sq ft", "Amenities"],
      ["RERA registered", "Compliance"],
    ]) {
      expect(within(stats).getByText(value)).toBeTruthy();
      expect(within(stats).getByText(label)).toBeTruthy();
    }
  });

  it("lists the master plan and the four tower floor plans, each on its original drawing", () => {
    const { container } = renderSite();
    const section = container.querySelector("#floor-plans")!;
    expect(within(section as HTMLElement).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
      floorPlanRows.map((r) => r.name),
    );
    expect(floorPlanRows.map((r) => r.name)).toEqual([
      "Master Plan",
      "Neem Tower Floor Plan",
      "Gulmohar Tower Floor Plan",
      "Ashoka Tower Floor Plan",
      "Banyan Tower Floor Plan",
    ]);
    expect(floorPlanRows.map((r) => r.image)).toEqual([
      "/demos/verdant-crest/master-plan.jpg",
      "/demos/verdant-crest/tower-a-floor-plan.jpg",
      "/demos/verdant-crest/tower-b-floor-plan.jpg",
      "/demos/verdant-crest/tower-c-floor-plan.jpg",
      "/demos/verdant-crest/tower-d-floor-plan.jpg",
    ]);
  });

  it("has all 10 FAQs as one-open-at-a-time details, the first one open", () => {
    const { container } = renderSite();
    const details = [...container.querySelectorAll<HTMLDetailsElement>("#faq details")];
    expect(details).toHaveLength(10);
    expect(details.map((d) => d.querySelector("summary")!.textContent)).toEqual(faqItems.map((f) => f.question));
    expect(details.every((d) => d.getAttribute("name") === "verdant-crest-faq")).toBe(true);
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
    expect(imgs).toHaveLength(23);
    for (const img of imgs) {
      expect(img.getAttribute("alt")?.trim()).toBeTruthy();
      // next/image rewrites src to its optimizer; a raw <img> would keep the plain public path.
      expect(img.getAttribute("src")).toMatch(/\/_next\/image\?url=%2Fdemos%2Fverdant-crest%2F[a-z0-9-]+\.jpg/);
    }
    // Every file in the folder is shown somewhere, and every image shown is a file in the folder.
    const shown = new Set(imgs.map((img) => decodeURIComponent(img.getAttribute("src")!.match(/url=([^&]+)/)![1]).split("/").pop()));
    const onDisk = readdirSync(join(process.cwd(), "public/demos/verdant-crest")).filter((f) => f.endsWith(".jpg"));
    expect(onDisk).toHaveLength(19);
    expect([...shown].sort()).toEqual([...onDisk].sort());
  });

  it("has no walkthrough video and maps only the Tellapur area, with no business pin", () => {
    const { container } = renderSite();
    expect(container.querySelector("#walkthrough")).toBeNull();
    expect(container.querySelector('iframe[src*="youtube"], a[href*="youtube"], a[href*="youtu.be"]')).toBeNull();
    const frames = [...container.querySelectorAll("iframe")];
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute("src")).toBe("https://www.google.com/maps?q=Tellapur%2C%20Hyderabad&output=embed");
    expect(site.mapEmbedSrc).toBe(frames[0].getAttribute("src"));
  });

  it("names none of the real project, its builder, address, figures or people", () => {
    const { container } = renderSite();
    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    const html = container.ownerDocument.body.innerHTML;
    expect(html).not.toMatch(REAL_PROJECT);
    expect(html).not.toMatch(REAL);
    // Only the demo's own links leave the page: WhatsApp, the map embed, phone and email.
    const external = [...container.querySelectorAll<HTMLElement>("[href^='http'], [src^='http']")].map(
      (el) => el.getAttribute("href") ?? el.getAttribute("src")!,
    );
    for (const url of external) expect(url).toMatch(/^https:\/\/(wa\.me\/917382130063|www\.google\.com\/maps\?q=Tellapur)/);
    expect(container.textContent).toContain("Verdant Crest by Nilaya Developers");
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

  it("the footer has the generic RERA line and says the demo and its names are made up", () => {
    const { container } = renderSite();
    const footer = container.querySelector("footer")!;
    expect(footer.textContent).toContain("RERA registered. Details on request.");
    expect(footer.textContent).not.toMatch(/P02\d|registration (no|number|id)/i);
    expect(footer.textContent).toContain("Demo site by onlydevs. Details for illustration.");
    expect(footer.textContent).toContain("Verdant Crest and Nilaya Developers are fictional.");
    expect(footer.textContent).toContain("Tellapur, Hyderabad");
    expect(footer.querySelector('a[href*="privacy"], a[href*="terms"]')).toBeNull();
  });
});

describe("Verdant Crest data", () => {
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
    expect(eoiMessage({ name: " Meera ", phone: "9876543210" })).toBe("Hello Verdant Crest! I would like to register an EOI.\nName: Meera\nPhone: 9876543210");
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
      "Hello Verdant Crest! I would like to book a site visit.\nName: Ravi\nEmail: ravi@example.com\nPhone: 9876543210\nInterested in: 3 BHK luxury",
    );
  });
});
