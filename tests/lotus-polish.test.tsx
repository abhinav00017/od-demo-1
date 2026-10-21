import { fireEvent, render, screen, within } from "@testing-library/react";
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
  it("shows an illustrated portrait and avatar, labelled as an illustration, with no initials", () => {
    const { container } = renderPage("");
    const hero = container.querySelector("main section")!;
    const portrait = hero.querySelector('[data-portrait="portrait"]')!;
    const avatar = hero.querySelector('[data-portrait="avatar"]')!;
    expect(portrait.getAttribute("role")).toBe("img");
    expect(portrait.getAttribute("aria-label")).toMatch(/^Illustration of Dr\. Ananya Rao/);
    expect(avatar.getAttribute("aria-label")).toMatch(/^Illustration/);
    // 4:5 portrait viewBox in a rounded-3xl 4:5 mask; the avatar is round and phone-only.
    expect(portrait.getAttribute("viewBox")).toBe("0 0 400 500");
    expect(portrait.parentElement!.className).toContain("aspect-[4/5]");
    expect(portrait.parentElement!.className).toContain("rounded-3xl");
    expect(avatar.getAttribute("class")).toContain("rounded-full");
    expect(avatar.getAttribute("class")).toContain("sm:hidden");
    expect(hero.textContent).not.toContain(clinic.doctor.initials);
    expect(within(hero as HTMLElement).getAllByRole("heading", { name: clinic.doctor.name })).toHaveLength(1);
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

  it("puts the hero on the tint and the why section on a full-bleed tinted band", () => {
    const { container } = renderPage("");
    const hero = container.querySelector("main section") as HTMLElement;
    expect(hero.style.backgroundColor).toBe("var(--color-lotus-tint)");
    const why = container.querySelector('[aria-labelledby="why-heading"]')!;
    expect(why.className).toContain("bg-lotus-tint");
    for (const card of why.querySelectorAll("ul > li")) expect(card.className).toContain("bg-white");
  });

  it("shows the Google G, five decorative stars and the review count by the rating", () => {
    const { container } = renderPage("");
    const numbers = container.querySelector('[aria-labelledby="numbers-heading"]')!;
    const rating = within(numbers as HTMLElement).getByText("4.9");
    expect(rating.querySelector("[data-google-g]")).toBeTruthy();
    const stars = numbers.querySelector("[data-stars]")!;
    expect(stars.getAttribute("aria-hidden")).toBe("true");
    expect(stars.querySelectorAll("svg")).toHaveLength(5);
    expect(numbers.textContent).toContain("312 reviews");
    expect(numbers.textContent).toContain("Google rating");
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
  it.each(["", "services", "about", "contact"] as DemoPage[])("shows on '%s' with Book a visit and WhatsApp, below lg only", (page) => {
    const { container } = renderPage(page);
    const el = bar();
    expect(el).toBeTruthy();
    expect(el!.className).toContain("lg:hidden");
    expect(el!.className).toContain("fixed");
    expect(el!.className).toContain("env(safe-area-inset-bottom)");
    expect(within(el!).getByRole("link", { name: /Book a visit/ }).getAttribute("href")).toBe("/clinic/website/book");
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

  it("hides while the mobile menu is open and comes back when it closes", () => {
    renderPage("");
    expect(bar()).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(document.getElementById("lotus-menu")).toBeTruthy();
    expect(bar()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(bar()).toBeTruthy();
  });
});

describe("Lotus micro-detail", () => {
  it("sets the headline at 800 with -0.03em tracking and keeps the hero line within 36ch", () => {
    const { container } = renderPage("");
    const h1 = container.querySelector("h1")!;
    expect(h1.className).toContain("font-extrabold");
    expect(h1.className).toContain("tracking-[-0.03em]");
    expect(h1.nextElementSibling!.className).toContain("max-w-[36ch]");
  });

  it("lifts content cards on hover", () => {
    const { container } = renderPage("");
    for (const id of ["stories-heading", "why-heading"]) {
      for (const li of container.querySelectorAll(`[aria-labelledby="${id}"] ul > li`)) {
        expect(li.className).toContain("hover:-translate-y-0.5");
        expect(li.className).toContain("hover:shadow-lotus-lift");
      }
    }
    for (const a of container.querySelectorAll('[aria-labelledby="services-heading"] ul > li > a')) {
      expect(a.className).toContain("hover:-translate-y-0.5");
    }
  });
});
