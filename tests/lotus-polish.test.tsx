import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getService } from "@/lib/catalog";
import type { DemoPage } from "@/lib/demos";
import { LiveDemo } from "@/demos/render";
import { clinic, clinicWhatsAppHref, homeServiceSlugs } from "@/demos/lotus-clinic/data";
import { showsMobileBar } from "@/demos/lotus-clinic/LotusSite";

// The book page reads ?type= with useSearchParams, which needs the Next.js router outside tests.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(),
}));

// The admin page asks the API for its session on mount. Tests have no server, so the request just waits.
vi.stubGlobal("fetch", () => new Promise(() => {}));

function renderPage(page: DemoPage) {
  const found = getService("clinic", "website");
  if (!found || found.service.status !== "live") throw new Error("clinic website demo is not live");
  return render(<LiveDemo industry={found.industry} service={found.service} page={page} />);
}

const bar = () => document.querySelector("[data-lotus-bar]") as HTMLElement | null;

describe("Lotus hero portrait", () => {
  it("shows the AR initials in a large 4:5 rounded card, with a round avatar on phones, and no illustration", () => {
    const { container } = renderPage("");
    const hero = container.querySelector("main section")!;
    const portrait = hero.querySelector('[data-portrait="portrait"]')!;
    const avatar = hero.querySelector('[data-portrait="avatar"]')!;
    expect(portrait.textContent).toBe(clinic.doctor.initials);
    expect(portrait.className).toContain("aspect-[4/5]");
    expect(portrait.className).toContain("rounded-3xl");
    expect(portrait.className).toContain("hidden sm:flex");
    expect(portrait.querySelector(".bg-lotus-avatar.rounded-full")).toBeTruthy();
    expect(avatar.textContent).toBe(clinic.doctor.initials);
    expect(avatar.className).toContain("rounded-full");
    expect(avatar.className).toContain("sm:hidden");
    // Decorative: the name is the h1 beside it.
    expect(portrait.getAttribute("aria-hidden")).toBe("true");
    expect(hero.querySelector("svg[role=img]")).toBeNull();
    expect(within(hero as HTMLElement).getAllByRole("heading", { name: clinic.doctor.name })).toHaveLength(1);
    expect(within(hero as HTMLElement).getByRole("heading", { level: 1 }).textContent).toBe(clinic.doctor.name);
  });

  it("uses the round avatar on About", () => {
    const { container } = renderPage("about");
    expect(container.querySelector('[data-portrait="avatar"]')).toBeTruthy();
    expect(container.querySelector('[data-portrait="portrait"]')).toBeNull();
  });
});

describe("Lotus signature and trust visuals", () => {
  it("puts the thin lotus line-mark before each visible home section title", () => {
    const { container } = renderPage("");
    for (const id of ["stories-heading", "why-heading", "services-heading", "visit-heading"]) {
      const h2 = container.querySelector(`#${id}`)!;
      expect(h2.firstElementChild?.hasAttribute("data-lotus-linemark"), id).toBe(true);
      expect(h2.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("alternates white and tinted bands down the home page, with white cards on the tint", () => {
    const { container } = renderPage("");
    const hero = container.querySelector("main section") as HTMLElement;
    expect(hero.style.backgroundColor).toBe("var(--color-lotus-tint)");
    const tinted = (id: string) => container.querySelector(`[aria-labelledby="${id}"]`)!.className.includes("bg-lotus-tint");
    expect(["numbers-heading", "services-heading", "why-heading", "stories-heading", "visit-heading"].map(tinted)).toEqual([false, true, false, true, false]);
    for (const id of ["stories-heading", "services-heading"]) {
      for (const card of container.querySelectorAll(`[aria-labelledby="${id}"] ul > li`)) expect(card.className).toContain("bg-white");
    }
  });

  it("shows the Google G, five decorative stars and the review count by the rating", () => {
    const { container } = renderPage("");
    const numbers = container.querySelector('[aria-labelledby="numbers-heading"]')!;
    // The figure is its own count-up span now, so look for the G in its stat card.
    const rating = within(numbers as HTMLElement).getByText("4.9").closest("[data-stat]")!;
    expect(rating.querySelector("[data-google-g]")).toBeTruthy();
    const stars = numbers.querySelector("[data-stars]")!;
    expect(stars.getAttribute("aria-hidden")).toBe("true");
    expect(stars.querySelectorAll("svg")).toHaveLength(5);
    expect(numbers.textContent).toContain("312 reviews");
    expect(numbers.textContent).toContain("Google Rating");
  });

  it("gives each testimonial an initials avatar beside the name and area", () => {
    const { container } = renderPage("");
    const items = container.querySelectorAll('[aria-labelledby="stories-heading"] ul > li');
    expect([...items].map((li) => li.querySelector("[data-avatar]")?.textContent)).toEqual(["SK", "DR"]);
    for (const [i, li] of [...items].entries()) {
      expect(li.textContent).toContain(clinic.testimonials[i].name);
      expect(li.textContent).toContain(clinic.testimonials[i].area);
    }
  });
});

describe("Lotus service icons", () => {
  it("maps every service to a line icon", () => {
    expect(clinic.services.map((s) => [s.slug, s.icon])).toEqual([
      ["pregnancy-care", "baby"],
      ["gynecology", "stethoscope"],
      ["fertility", "heart-pulse"],
      ["pcos", "activity"],
      ["menopause", "sun"],
      ["online", "video"],
    ]);
  });

  it("renders the icon in each home service card", () => {
    const { container } = renderPage("");
    const cards = container.querySelectorAll('[aria-labelledby="services-heading"] ul > li');
    expect(cards).toHaveLength(homeServiceSlugs.length);
    cards.forEach((card, i) => {
      const icon = card.querySelector("[data-service-icon]")!;
      expect(icon.getAttribute("data-service-icon")).toBe(clinic.services.find((s) => s.slug === homeServiceSlugs[i])!.icon);
      expect(icon.querySelector("svg")).toBeTruthy();
    });
  });

  it("renders the icon in each services page card", () => {
    renderPage("services");
    for (const s of clinic.services) {
      const card = document.getElementById(s.slug)!;
      expect(card.querySelector(`[data-service-icon="${s.icon}"] svg`), s.slug).toBeTruthy();
    }
  });
});

describe("Lotus sticky mobile bar", () => {
  it.each(["", "services", "about", "contact"] as DemoPage[])("shows on '%s' with Book an Appointment and WhatsApp, below lg only", (page) => {
    const { container } = renderPage(page);
    const el = bar();
    expect(el).toBeTruthy();
    expect(el!.className).toContain("lg:hidden");
    expect(el!.className).toContain("fixed");
    expect(el!.className).toContain("env(safe-area-inset-bottom)");
    expect(within(el!).getByRole("link", { name: /Book an Appointment/ }).getAttribute("href")).toBe("/clinic/website/book");
    const wa = within(el!).getByRole("link", { name: `WhatsApp ${clinic.phone}` });
    expect(wa.getAttribute("href")).toBe(clinicWhatsAppHref);
    expect(wa.getAttribute("target")).toBe("_blank");
    // The page leaves room under the content so the bar never covers it.
    const site = container.querySelector('[data-site="lotus"]')!;
    expect(site.className).toContain("pb-[calc(4.75rem+env(safe-area-inset-bottom))]");
    expect(site.className).toContain("lg:pb-0");
    // Outside the header, so it is not part of the banner landmark.
    expect(screen.getByRole("banner").contains(el)).toBe(false);
  });

  it.each(["book", "admin"] as DemoPage[])("is left out on '%s'", (page) => {
    const { container } = renderPage(page);
    expect(bar()).toBeNull();
    expect(container.querySelector('[data-site="lotus"]')!.className).not.toContain("safe-area-inset-bottom");
    expect(showsMobileBar(page)).toBe(false);
  });

  it("hides while the mobile menu is open and comes back when it closes", async () => {
    renderPage("");
    expect(bar()).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(document.getElementById("lotus-menu")).toBeTruthy();
    // The bar slides away first, then leaves the page.
    await waitFor(() => expect(bar()).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(bar()).toBeTruthy();
  });
});

describe("Lotus micro-detail", () => {
  it("sets the headline at 800 with -0.03em tracking", () => {
    const { container } = renderPage("");
    const h1 = container.querySelector("h1")!;
    expect(h1.className).toContain("font-extrabold");
    expect(h1.className).toContain("tracking-[-0.03em]");
  });

  it("lifts content cards on hover", () => {
    const { container } = renderPage("");
    for (const id of ["stories-heading", "why-heading", "services-heading"]) {
      for (const li of container.querySelectorAll(`[aria-labelledby="${id}"] ul > li`)) {
        // The 3px lift is a motion whileHover; the shadow stays CSS. CSS never transitions the card's transform.
        expect(li.hasAttribute("data-lift")).toBe(true);
        expect(li.className).toContain("hover:shadow-lotus-lift");
        expect(li.className).not.toMatch(/(^|\s)transition(\s|$)/);
      }
    }
  });
});
