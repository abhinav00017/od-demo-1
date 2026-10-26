import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoPageParams, getDemoPage, getIndustry, getService, industries, serviceParams } from "@/lib/catalog";
import { catalogSchema } from "@/lib/schema";
import { IndustryView } from "@/components/sections/IndustryView";
import { ServicePreview } from "@/components/sections/ServicePreview";
import { LiveDemo, liveDemoDescription, liveDemoTitle } from "@/demos/render";

// The book page reads ?type= with useSearchParams, which needs the Next.js router outside tests.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(),
}));

// The admin page asks the API for its session on mount. Tests have no server, so the request just waits.
vi.stubGlobal("fetch", () => new Promise(() => {}));

describe("every service route resolves", () => {
  it("generates 30 service routes and 5 inner demo pages", () => {
    expect(serviceParams()).toHaveLength(30);
    expect(demoPageParams().map((p) => `/${p.industry}/${p.service}/${p.page}`)).toEqual([
      "/clinic/website/services",
      "/clinic/website/about",
      "/clinic/website/contact",
      "/clinic/website/book",
      "/clinic/website/admin",
    ]);
  });

  it.each(serviceParams())("/$industry/$service renders a page titled with its service", ({ industry, service }) => {
    const found = getService(industry, service);
    expect(found).toBeDefined();
    if (!found) return;
    if (found.service.status === "live") {
      render(<LiveDemo industry={found.industry} service={found.service} page="" />);
      expect(screen.getByRole("link", { name: /Back to hub/ }).getAttribute("href")).toBe(`/${industry}`);
    } else {
      render(<ServicePreview industry={found.industry} service={found.service} />);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(found.service.name);
      expect(screen.getByRole("heading", { name: "What you get" })).toBeTruthy();
      expect(screen.getByRole("heading", { name: "How it works" })).toBeTruthy();
      expect(screen.getByRole("figure")).toBeTruthy();
    }
  });

  it.each(demoPageParams())("/$industry/$service/$page renders inside the demo site", ({ industry, service, page }) => {
    const found = getDemoPage(industry, service, page);
    expect(found).toBeDefined();
    if (!found || found.service.status !== "live") return;
    render(<LiveDemo industry={found.industry} service={found.service} page={found.page} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Book an Appointment/ }).length).toBeGreaterThan(0);
  });

  it("/cafe/website is the Solstice live demo, a single page with no inner pages", () => {
    const found = getService("cafe", "website");
    expect(found?.service.status).toBe("live");
    if (!found || found.service.status !== "live") return;
    expect(found.service.demo).toBe("solstice-cafe");
    expect(demoPageParams().filter((p) => p.industry === "cafe")).toEqual([]);
    expect(getDemoPage("cafe", "website", "about")).toBeUndefined();
    expect(liveDemoTitle("solstice-cafe", "")).toBe("Solstice Roastery & Bakehouse — Jubilee Hills");
    render(<LiveDemo industry={found.industry} service={found.service} page="" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The Freshest Brews in Jubilee Hills");
    expect(screen.getByRole("link", { name: /Back to hub/ }).getAttribute("href")).toBe("/cafe");
  });

  it("/real-estate/website is the Verdant Crest live demo, a single page with no inner pages", () => {
    const found = getService("real-estate", "website");
    expect(found?.service.status).toBe("live");
    if (!found || found.service.status !== "live") return;
    expect(found.service.demo).toBe("verdant-crest");
    expect(demoPageParams().filter((p) => p.industry === "real-estate")).toEqual([]);
    expect(getDemoPage("real-estate", "website", "about")).toBeUndefined();
    expect(liveDemoTitle("verdant-crest", "")).toBe("Verdant Crest — Sky residences in Tellapur");
    expect(liveDemoDescription("verdant-crest")).toBe(
      "Ultra-premium aesthetic light-theme real estate experience with editorial luxury storytelling.",
    );
    render(<LiveDemo industry={found.industry} service={found.service} page="" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Verdant Crest Tellapur Luxury 3 & 4 BHK Apartments");
    expect(screen.getByRole("link", { name: /Back to hub/ }).getAttribute("href")).toBe("/real-estate");
  });

  it("/real-estate lists 6 services in order, with Website as the live demo", () => {
    render(<IndustryView industry={getIndustry("real-estate")!} />);
    const list = screen.getByRole("list", { name: "Real estate services" });
    expect(within(list).getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Website",
      "Google Business Profile",
      "WhatsApp lead follow-up",
      "Site visit booking",
      "Digital brochure",
      "Lead dashboard",
    ]);
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/real-estate/website",
      "/real-estate/google-business-profile",
      "/real-estate/whatsapp-lead-follow-up",
      "/real-estate/site-visit-booking",
      "/real-estate/digital-brochure",
      "/real-estate/lead-dashboard",
    ]);
    expect(within(links[0]).getByText("Live demo")).toBeTruthy();
    expect(links.slice(1).every((a) => within(a).queryByText("Preview"))).toBe(true);
  });

  it("the lead dashboard preview draws the lead list mock", () => {
    const found = getService("real-estate", "lead-dashboard");
    if (!found || found.service.status !== "preview") throw new Error("lead-dashboard should be a preview");
    render(<ServicePreview industry={found.industry} service={found.service} />);
    const figure = screen.getByRole("figure");
    expect(within(figure).getByText("Lead dashboard · Banyan Heights")).toBeTruthy();
    expect(within(figure).getAllByText("Site visit booked").length).toBeGreaterThan(0);
  });

  it("/ticketing-platform/ticketing-platform is the ShowSalsa live demo, a single page with no inner pages", () => {
    const found = getService("ticketing-platform", "ticketing-platform");
    expect(found?.service.status).toBe("live");
    if (!found || found.service.status !== "live") return;
    expect(found.service.demo).toBe("showsalsa");
    expect(demoPageParams().filter((p) => p.industry === "ticketing-platform")).toEqual([]);
    expect(getDemoPage("ticketing-platform", "ticketing-platform", "about")).toBeUndefined();
    expect(getService("ticketing-platform", "website")).toBeUndefined();
    expect(liveDemoTitle("showsalsa", "")).toBe("ShowSalsa");
    expect(liveDemoDescription("showsalsa")).toBe(
      "Discover flagship concerts, underground techno nights, stand-up comedy specials, and curated cultural festivals across India with instant QR ticketing.",
    );
    render(<LiveDemo industry={found.industry} service={found.service} page="" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("DJ Kairav Live at Tidal Goa");
    expect(screen.getByRole("link", { name: /Back to hub/ }).getAttribute("href")).toBe("/ticketing-platform");
  });

  it("/ticketing-platform lists 6 services in order, with Ticketing platform as the live demo", () => {
    render(<IndustryView industry={getIndustry("ticketing-platform")!} />);
    const list = screen.getByRole("list", { name: "Ticketing platform services" });
    expect(within(list).getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Ticketing platform",
      "Event page",
      "WhatsApp tickets and reminders",
      "Google Business Profile",
      "Early bird offers",
      "Organiser dashboard",
    ]);
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/ticketing-platform/ticketing-platform",
      "/ticketing-platform/event-page",
      "/ticketing-platform/whatsapp-tickets-reminders",
      "/ticketing-platform/google-business-profile",
      "/ticketing-platform/early-bird-offers",
      "/ticketing-platform/organiser-dashboard",
    ]);
    expect(within(links[0]).getByText("Live demo")).toBeTruthy();
    expect(links.slice(1).every((a) => within(a).queryByText("Preview"))).toBe(true);
  });

  it("the event page preview draws the event page mock, with the sold-out tier marked", () => {
    const found = getService("ticketing-platform", "event-page");
    if (!found || found.service.status !== "preview") throw new Error("event-page should be a preview");
    render(<ServicePreview industry={found.industry} service={found.service} />);
    const figure = screen.getByRole("figure");
    expect(within(figure).getByText("Sunset Sessions Vol. 4")).toBeTruthy();
    expect(within(figure).getByText("Sold out")).toBeTruthy();
    expect(within(figure).getByText("Book tickets")).toBeTruthy();
  });

  it("/tiles/crm is the CRM live demo, a single page with no inner pages", () => {
    const found = getService("tiles", "crm");
    expect(found?.service.status).toBe("live");
    if (!found || found.service.status !== "live") return;
    expect(found.service.demo).toBe("tiles-crm");
    expect(demoPageParams().filter((p) => p.industry === "tiles")).toEqual([]);
    expect(getDemoPage("tiles", "crm", "q")).toBeUndefined();
    expect(liveDemoTitle("tiles-crm", "")).toBe("CRM | Kalyani Tiles & Sanitary");
    expect(liveDemoDescription("tiles-crm")).toBe("Leads, quotes and follow-ups for Kalyani Tiles & Sanitary, a made-up tile showroom in Visakhapatnam.");
    render(<LiveDemo industry={found.industry} service={found.service} page="" />);
    // Fetch never answers here, so the app waits on its session check.
    expect(screen.getByText("Loading the CRM…")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to hub/ }).getAttribute("href")).toBe("/tiles");
  });

  it("/tiles lists 6 services in order, with CRM as the live demo", () => {
    render(<IndustryView industry={getIndustry("tiles")!} />);
    const list = screen.getByRole("list", { name: "Tiles & showrooms services" });
    expect(within(list).getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "CRM",
      "Website",
      "Google Business Profile",
      "WhatsApp quotes",
      "Digital catalogue",
      "Sales dashboard",
    ]);
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/tiles/crm",
      "/tiles/website",
      "/tiles/google-business-profile",
      "/tiles/whatsapp-quotes",
      "/tiles/digital-catalogue",
      "/tiles/sales-dashboard",
    ]);
    expect(within(links[0]).getByText("Live demo")).toBeTruthy();
    expect(links.slice(1).every((a) => within(a).queryByText("Preview"))).toBe(true);
  });

  it.each([
    ["website", "Floor"],
    ["digital-catalogue", "600x600"],
  ])("the tiles %s preview draws the catalogue mock, filtered by %s first", (slug, firstFilter) => {
    const found = getService("tiles", slug);
    if (!found || found.service.status !== "preview") throw new Error(`${slug} should be a preview`);
    render(<ServicePreview industry={found.industry} service={found.service} />);
    const figure = screen.getByRole("figure");
    expect(within(figure).getAllByText(/\/box$/).length).toBeGreaterThanOrEqual(4);
    expect(within(figure).getByText(firstFilter)).toBeTruthy();
  });

  it("the clinic demo keeps its own titles", () => {
    expect(liveDemoTitle("lotus-clinic", "")).toMatch(/^Lotus Women's Clinic \| Gynecologist & Obstetrician in /);
    expect(liveDemoTitle("lotus-clinic", "book")).toBe("Book | Lotus Women's Clinic");
  });

  it("unknown slugs do not resolve", () => {
    expect(getIndustry("nope")).toBeUndefined();
    expect(getService("clinic", "nope")).toBeUndefined();
    expect(getDemoPage("clinic", "website", "nope")).toBeUndefined();
    expect(getDemoPage("clinic", "whatsapp-automation", "about")).toBeUndefined();
  });
});

describe("content validation", () => {
  it("rejects a duplicate service slug", () => {
    const clinic = industries[0];
    const bad = [{ ...clinic, services: [...clinic.services, clinic.services[1]] }];
    expect(() => catalogSchema.parse(bad)).toThrow(/duplicate service .*google-business-profile/);
  });

  it("rejects a live service that names an unknown demo", () => {
    const clinic = industries[0];
    const bad = [{ ...clinic, services: [{ ...clinic.services[0], demo: "nope" }] }];
    expect(() => catalogSchema.parse(bad)).toThrow();
  });
});
