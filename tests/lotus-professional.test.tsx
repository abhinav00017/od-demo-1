import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getService } from "@/lib/catalog";
import type { DemoPage } from "@/lib/demos";
import { LiveDemo, liveDemoTitle } from "@/demos/render";
import { clinic, clinicWhatsAppHref, homeServiceSlugs } from "@/demos/lotus-clinic/data";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(),
}));
vi.stubGlobal("fetch", () => new Promise(() => {}));

function renderPage(page: DemoPage) {
  const found = getService("clinic", "website");
  if (!found || found.service.status !== "live") throw new Error("clinic website demo is not live");
  return render(<LiveDemo industry={found.industry} service={found.service} page={page} />);
}

const section = (c: HTMLElement, id: string) => c.querySelector(`[aria-labelledby="${id}"]`) as HTMLElement;

describe("Lotus professional copy", () => {
  it("leads the hero with the doctor, credentials, tagline, positioning, two buttons and a trust strip", () => {
    const { container } = renderPage("");
    const hero = container.querySelector("main section") as HTMLElement;
    expect(within(hero).getByRole("heading", { level: 1 }).textContent).toBe("Dr. Ananya Rao");
    expect(hero.textContent).toContain("MBBS, MS (Obstetrics & Gynecology)");
    expect(hero.textContent).toContain("Expert care for women at every stage of life");
    expect(hero.textContent).toContain("Visakhapatnam, with more than 12 years of experience");
    expect(within(hero).getByRole("link", { name: "Book an Appointment" }).getAttribute("href")).toBe("/clinic/website/book");
    const online = within(hero).getByRole("link", { name: "Consult Online" });
    expect(online.getAttribute("href")).toBe("/clinic/website/book?type=online");
    expect(online.querySelector("[data-arrow-circle]")).toBeTruthy();
    const trust = hero.querySelector("[data-trust]")!;
    expect(trust.querySelector("[data-google-g]")).toBeTruthy();
    expect(trust.textContent).toContain("12+ Years of Experience");
    expect(trust.textContent).toContain("FOGSI Member");
    expect(hero.textContent).toContain("Consultant Obstetrician & Gynecologist");
    expect(hero.textContent).toContain("12+ years");
  });

  it("titles each home section in Title Case with a one-line sub-heading", () => {
    const { container } = renderPage("");
    const titles: Record<string, string> = {
      "services-heading": "Our Specialities",
      "why-heading": "Why Choose Lotus Women's Clinic",
      "stories-heading": "What Our Patients Say",
      "visit-heading": "Visit Us",
    };
    for (const [id, title] of Object.entries(titles)) {
      const h2 = container.querySelector(`#${id}`)!;
      expect(h2.textContent).toBe(title);
      expect(h2.nextElementSibling?.tagName).toBe("P");
    }
    expect(container.querySelector("#services-heading")!.nextElementSibling!.textContent).toBe("Comprehensive women's healthcare under one roof.");
  });

  it("shows four stats as tinted cards with a thin rule under each figure", () => {
    const { container } = renderPage("");
    const cards = section(container, "numbers-heading").querySelectorAll("[data-stat]");
    expect([...cards].map((c) => c.querySelector("dt")!.firstChild!.textContent)).toEqual([
      "Years of Experience",
      "Patients Treated",
      "Successful Deliveries",
      "Google Rating",
    ]);
    expect(section(container, "numbers-heading").textContent).toContain("3,000+");
    for (const c of cards) {
      expect(c.className).toContain("bg-lotus-avatar");
      expect(c.querySelector("dd")!.className).toContain("after:h-px");
    }
  });

  it("leads the stats with a centred headline and sub-heading", () => {
    const { container } = renderPage("");
    const numbers = section(container, "numbers-heading");
    const h2 = numbers.querySelector("#numbers-heading")!;
    expect(h2.tagName).toBe("H2");
    expect(h2.textContent).toBe("Trusted by thousands of women across Visakhapatnam.");
    expect(h2.className).not.toContain("sr-only");
    expect(h2.firstElementChild?.hasAttribute("data-lotus-linemark")).toBe(true);
    expect(h2.nextElementSibling!.textContent).toBe("Twelve years of compassionate, evidence-based care.");
    expect(h2.parentElement!.className).toContain("text-center");
    expect(h2.compareDocumentPosition(numbers.querySelector("dl")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("closes the stats with the doctor's quote from data.ts, attributed under it", () => {
    const { container } = renderPage("");
    const numbers = section(container, "numbers-heading");
    const quote = numbers.querySelector("[data-quote]")!;
    expect(clinic.quote).toBe("Every woman deserves care that listens first.");
    expect(quote.className).toContain("text-center");
    expect(numbers.querySelector("dl")!.compareDocumentPosition(quote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const text = quote.querySelector("blockquote")!;
    expect(text.textContent).toContain(clinic.quote);
    expect(text.className).toContain("italic");
    expect(text.className).toContain("sm:text-2xl");
    const mark = text.querySelector("[aria-hidden]")!;
    expect(mark.className).toContain("text-lotus-accent");
    expect(quote.querySelector("figcaption")!.textContent).toBe("Dr. Ananya Rao, Consultant Obstetrician & Gynecologist");
  });

  it("gives each home service card an icon circle, a clinical title, two sentences and a Know More pill", () => {
    const { container } = renderPage("");
    const cards = section(container, "services-heading").querySelectorAll("ul > li");
    cards.forEach((card, i) => {
      const s = clinic.services.find((x) => x.slug === homeServiceSlugs[i])!;
      expect(card.querySelector("[data-service-icon]")!.className).toContain("rounded-full");
      expect(card.querySelector("h3")!.textContent).toBe(s.name);
      expect(s.short.replace(/Dr\./g, "Dr").match(/\.(\s|$)/g)).toHaveLength(2);
      const more = within(card as HTMLElement).getByRole("link", { name: `Know More about ${s.name}` });
      expect(more.getAttribute("href")).toBe(`/clinic/website/services#${s.slug}`);
      expect(more.querySelector("[data-arrow-circle]")).toBeTruthy();
    });
    expect(clinic.services.map((s) => s.name)).toEqual([
      "Obstetrics & Pregnancy Care",
      "Gynecology Consultations",
      "Fertility & IVF Guidance",
      "PCOS & Hormonal Health",
      "Menopause Care",
      "Online Consultations",
    ]);
  });

  it("lists four credibility points and tags each testimonial as a Google review from Visakhapatnam", () => {
    const { container } = renderPage("");
    expect([...section(container, "why-heading").querySelectorAll("h3")].map((h) => h.textContent)).toEqual([
      "Evidence-Based Treatment",
      "Personalised Care Plans",
      "Advanced Diagnostics on Site",
      "Timely Follow-Ups on WhatsApp",
    ]);
    for (const li of section(container, "stories-heading").querySelectorAll("ul > li")) {
      expect(li.textContent).toContain("Google review");
      expect(li.textContent).toContain("Visakhapatnam");
    }
  });

  it("keeps the copy free of contractions on the visible pages", () => {
    for (const page of ["", "services", "about", "contact", "book"] as DemoPage[]) {
      const { container, unmount } = renderPage(page);
      const text = container.querySelector("main")!.textContent ?? "";
      expect(text, page).not.toMatch(/\b\w+'(t|re|ll|ve|d|m)\b/i);
      unmount();
    }
  });

  it("gives About a qualifications list with degrees, FOGSI, an affiliation and languages", () => {
    const { container } = renderPage("about");
    const list = container.querySelector("[data-qualifications]")!;
    expect([...list.querySelectorAll("dt")].map((d) => d.textContent)).toEqual(["MBBS", "MS", "FOGSI", "Affiliation", "Languages"]);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("About Dr. Ananya Rao");
  });

  it("says Book an Appointment in the header, the mobile menu and the sticky bar, and never Book a visit", () => {
    const { container } = renderPage("");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(within(document.getElementById("lotus-menu")!).getByRole("link", { name: "Book an Appointment" })).toBeTruthy();
    expect(container.textContent).not.toMatch(/Book a visit/i);
  });

  it("ends with the tagline, hours and the copyright line", () => {
    const { container } = renderPage("");
    const footer = container.querySelector("footer")!;
    expect(footer.textContent).toContain(`${clinic.tagline}.`);
    expect(footer.textContent).toContain("Monday to Saturday");
    expect(footer.textContent).toContain("© 2026 Lotus Women's Clinic. All rights reserved.");
  });

  it("titles the home page for search", () => {
    expect(liveDemoTitle("lotus-clinic", "")).toBe("Lotus Women's Clinic | Gynecologist & Obstetrician in Visakhapatnam");
    expect(liveDemoTitle("lotus-clinic", "services")).toBe("Services | Lotus Women's Clinic");
  });
});

describe("Lotus airy layout and Krest touches", () => {
  it("gives the desktop hero ~80vh and the sections airy padding", () => {
    const { container } = renderPage("");
    const hero = container.querySelector("main section > div")!;
    expect(hero.className).toContain("lg:min-h-[80vh]");
    for (const id of ["numbers-heading", "services-heading", "why-heading", "stories-heading", "visit-heading"]) {
      const inner = section(container, id).firstElementChild!;
      expect(inner.className, id).toContain("py-14");
      expect(inner.className, id).toContain("lg:py-24");
    }
  });

  it.each(["", "services", "about", "contact"] as DemoPage[])("puts a round WhatsApp call button bottom-right on desktop only on '%s'", (page) => {
    renderPage(page);
    const float = document.querySelector("[data-lotus-float]") as HTMLAnchorElement;
    expect(float.getAttribute("href")).toBe(clinicWhatsAppHref);
    expect(float.getAttribute("target")).toBe("_blank");
    expect(float.className).toContain("fixed");
    expect(float.className).toContain("rounded-full");
    expect(float.className).toContain("hidden");
    expect(float.className).toContain("lg:flex");
    expect(float.textContent).toContain(clinic.phone);
  });

  it.each(["book", "admin"] as DemoPage[])("leaves the call button out on '%s'", (page) => {
    renderPage(page);
    expect(document.querySelector("[data-lotus-float]")).toBeNull();
  });
});
