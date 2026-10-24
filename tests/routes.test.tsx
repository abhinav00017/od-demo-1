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
  it("generates 18 service routes and 5 inner demo pages", () => {
    expect(serviceParams()).toHaveLength(18);
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

  it("/real-estate/website is the Sky49 live demo, a single page with no inner pages", () => {
    const found = getService("real-estate", "website");
    expect(found?.service.status).toBe("live");
    if (!found || found.service.status !== "live") return;
    expect(found.service.demo).toBe("sky49");
    expect(demoPageParams().filter((p) => p.industry === "real-estate")).toEqual([]);
    expect(getDemoPage("real-estate", "website", "about")).toBeUndefined();
    expect(liveDemoTitle("sky49", "")).toBe("THE SKY49");
    expect(liveDemoDescription("sky49")).toBe(
      "Ultra-premium aesthetic light-theme real estate experience with editorial luxury storytelling.",
    );
    render(<LiveDemo industry={found.industry} service={found.service} page="" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Sky49 Tellapur Luxury 3 & 4 BHK Apartments");
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
