import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoPageParams, getDemoPage, getIndustry, getService, industries, serviceParams } from "@/lib/catalog";
import { catalogSchema } from "@/lib/schema";
import { ServicePreview } from "@/components/sections/ServicePreview";
import { LiveDemo } from "@/demos/render";

// The book page reads ?type= with useSearchParams, which needs the Next.js router outside tests.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(),
}));

// The admin page asks the API for its session on mount. Tests have no server, so the request just waits.
vi.stubGlobal("fetch", () => new Promise(() => {}));

describe("every service route resolves", () => {
  it("generates 12 service routes and 5 inner demo pages", () => {
    expect(serviceParams()).toHaveLength(12);
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
