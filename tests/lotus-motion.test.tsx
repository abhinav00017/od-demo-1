import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getService } from "@/lib/catalog";
import { LiveDemo } from "@/demos/render";
import { clinic, homeServiceSlugs } from "@/demos/lotus-clinic/data";
import { Dashboard } from "@/demos/lotus-clinic/Dashboard";
import { CountUp, ecgPath, formatFigure, MotionProvider, parseFigure, Reveal, RevealGroup, RevealItem } from "@/demos/lotus-clinic/Motion";
import type { DashboardBooking } from "@/lib/bookings/types";
import { intersectAll, setReducedMotion } from "./setup";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => setReducedMotion(false));

function renderHome() {
  const found = getService("clinic", "website");
  if (!found || found.service.status !== "live") throw new Error("clinic website demo is not live");
  return render(<LiveDemo industry={found.industry} service={found.service} page="" />);
}

describe("Reveal", () => {
  it("renders its children, waits hidden 16px low until it scrolls into view, then shows", async () => {
    render(
      <MotionProvider>
        <Reveal as="section" className="band" data-testid="reveal">
          <h2>Our Specialities</h2>
        </Reveal>
      </MotionProvider>,
    );
    const el = screen.getByTestId("reveal");
    expect(el.tagName).toBe("SECTION");
    expect(el.className).toBe("band");
    expect(screen.getByRole("heading", { name: "Our Specialities" })).toBeTruthy();
    expect(el.style.opacity).toBe("0");
    expect(el.style.transform).toContain("translateY(16px)");
    act(() => intersectAll());
    await waitFor(() => expect(el.style.opacity).toBe("1"));
  });

  it("uses no transforms under reduced motion: opacity only, and no hover lift", () => {
    setReducedMotion(true);
    render(
      <MotionProvider>
        <Reveal data-testid="reveal">Visit Us</Reveal>
        <RevealGroup as="ul">
          <RevealItem as="li" lift from="left" data-testid="card">
            Card
          </RevealItem>
        </RevealGroup>
      </MotionProvider>,
    );
    for (const id of ["reveal", "card"]) {
      const el = screen.getByTestId(id);
      expect(el.style.opacity, id).toBe("0");
      expect(el.style.transform, id).toBe("");
    }
    expect(screen.getByTestId("card").hasAttribute("data-lift")).toBe(true);
  });

  it("slides alternate testimonials in from the left and the right", () => {
    const { container } = renderHome();
    const cards = [...container.querySelectorAll('[aria-labelledby="stories-heading"] ul > li')] as HTMLElement[];
    expect(cards.map((c) => c.style.transform)).toEqual(["translateX(-24px)", "translateX(24px)"]);
  });
});

describe("stat count-up", () => {
  it("reads and writes each stat figure", () => {
    for (const v of ["12+", "8,000+", "3,000+", "4.9"]) expect(formatFigure(parseFigure(v)!.target, parseFigure(v)!)).toBe(v);
    expect(parseFigure("8,000+")).toEqual({ prefix: "", target: 8000, decimals: 0, grouped: true, suffix: "+" });
    expect(formatFigure(1234.4, parseFigure("8,000+")!)).toBe("1,234+");
    expect(formatFigure(2.46, parseFigure("4.9")!)).toBe("2.5");
    expect(parseFigure("Online")).toBeNull();
  });

  it("shows the final figure before it is seen, reserves its width, and ends on it", async () => {
    const { container } = render(
      <MotionProvider>
        <CountUp value="8,000+" />
      </MotionProvider>,
    );
    const box = container.querySelector("[data-count]") as HTMLElement;
    expect(box.getAttribute("data-count")).toBe("8,000+");
    expect(box.className).toContain("after:content-[attr(data-count)]");
    expect(box.textContent).toBe("8,000+");
    act(() => intersectAll());
    await waitFor(() => expect(box.textContent).toBe("8,000+"));
  });

  it("keeps the home stats as text for readers and tests", () => {
    const { container } = renderHome();
    const numbers = container.querySelector('[aria-labelledby="numbers-heading"]')!;
    expect([...numbers.querySelectorAll("[data-count]")].map((n) => n.textContent)).toEqual(["12+", "8,000+", "3,000+", "4.9"]);
  });
});

describe("mobile menu motion", () => {
  it("dims the page under the open menu and closes when the dim is tapped", async () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const overlay = document.querySelector("[data-lotus-overlay]") as HTMLElement;
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(overlay);
    expect(screen.getByRole("button", { name: "Menu" }).getAttribute("aria-expanded")).toBe("false");
    await waitFor(() => expect(document.getElementById("lotus-menu")).toBeNull());
    await waitFor(() => expect(document.querySelector("[data-lotus-bar]")).toBeTruthy());
  });
});

describe("server HTML", () => {
  it("ships a no-JavaScript style that shows every element waiting for an entrance", () => {
    const found = getService("clinic", "website");
    if (!found || found.service.status !== "live") throw new Error("clinic website demo is not live");
    const html = renderToString(<LiveDemo industry={found.industry} service={found.service} page="" />);
    expect(html).toContain("<noscript><style>[data-motion]{opacity:1!important;transform:none!important}</style></noscript>");
    // The figures are in the HTML at their final values; the count-up only runs in the browser.
    for (const v of ["12+", "8,000+", "3,000+", "4.9"]) expect(html).toContain(`data-count="${v}"`);
  });
});

describe("motion pass 2", () => {
  it("adds How a Visit Works after the numbers and before the specialities, with four steps in order", () => {
    const { container } = renderHome();
    const journey = container.querySelector('[aria-labelledby="journey-heading"]') as HTMLElement;
    expect(journey.querySelector("#journey-heading")!.textContent).toBe("How a Visit Works");
    const steps = [...journey.querySelectorAll("[data-journey] > li")];
    expect(steps).toHaveLength(4);
    expect(steps.map((li) => li.querySelector("h3")!.textContent)).toEqual(["Book online", "WhatsApp confirmation", "Visit the clinic", "Follow-up reminder"]);
    expect(steps.map((li) => li.querySelector("p")!.textContent)).toEqual(clinic.journey.map((j) => j.text));
    expect(journey.querySelector('[data-step="whatsapp"] [data-journey-phone]')).toBeTruthy();
    const sections = [...container.querySelectorAll("main section[aria-labelledby]")].map((el) => el.getAttribute("aria-labelledby"));
    expect(sections.slice(0, 3)).toEqual(["numbers-heading", "journey-heading", "services-heading"]);
  });

  it("shows the phone mock's final state in the static HTML and keeps it under reduced motion", async () => {
    const found = getService("clinic", "website");
    if (!found || found.service.status !== "live") throw new Error("clinic website demo is not live");
    const html = renderToString(<LiveDemo industry={found.industry} service={found.service} page="" />);
    expect(html).toContain(clinic.journeyChat.thanks);

    setReducedMotion(true);
    const { container } = renderHome();
    const phone = container.querySelector("[data-phone-mock]") as HTMLElement;
    expect(phone.getAttribute("role")).toBe("img");
    act(() => intersectAll());
    await new Promise((r) => setTimeout(r, 50));
    expect(phone.getAttribute("data-step")).toBe("7");
    expect(phone.textContent).toContain(clinic.journeyChat.confirmation);
    expect(phone.textContent).toContain(clinic.journeyChat.thanks);
    expect(phone.querySelectorAll("[data-phone-button]")).toHaveLength(2);
    expect(phone.querySelector("[data-typing]")).toBeNull();
  });

  it("gives each home speciality card a what-to-expect line from data.ts", () => {
    const { container } = renderHome();
    const cards = [...container.querySelectorAll('[aria-labelledby="services-heading"] ul > li')];
    expect(cards.map((c) => c.querySelector("[data-expect]")!.textContent)).toEqual(
      homeServiceSlugs.map((slug) => `What to expect: ${clinic.services.find((s) => s.slug === slug)!.expect}`),
    );
    // Hidden by opacity only on mouse screens, so it takes its space from the start and the card never resizes.
    expect(cards[0].querySelector("[data-expect]")!.className).toContain("pointer-fine:opacity-0");
    expect(cards[0].querySelector("[data-expect]")!.className).not.toMatch(/\bh-0\b|max-h/);
    for (const s of clinic.services) expect(s.expect.length).toBeGreaterThan(20);
  });

  it("draws a 2px scroll progress line under the demo bar, at zero before any scroll", () => {
    const { container } = renderHome();
    const bar = container.querySelector("[data-scroll-progress]") as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.className).toContain("h-0.5");
    expect(bar.style.transform).toBe("scaleX(0)");
    expect(bar.parentElement!.className).toContain("sticky");
  });

  it("puts one section dot per home section, desktop only, linking to each heading", () => {
    const { container } = renderHome();
    const dots = container.querySelector("[data-section-dots]") as HTMLElement;
    expect(dots.className).toContain("hidden");
    expect(dots.className).toContain("lg:flex");
    const links = [...dots.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      ["hero-heading", "numbers-heading", "journey-heading", "services-heading", "why-heading", "stories-heading", "visit-heading"].map((id) => `#${id}`),
    );
    for (const a of links) expect(document.getElementById(a.getAttribute("href")!.slice(1)), a.getAttribute("href")!).toBeTruthy();
    expect(links[0].getAttribute("aria-current")).toBe("true");
  });

  it("draws the ECG line at the measured width and blooms the header mark", () => {
    expect(ecgPath(400)).toMatch(/^M1 16 .* H399$/);
    const { container } = renderHome();
    expect(container.querySelector("main section [data-ecg] path")).toBeTruthy();
    expect(container.querySelector("header [data-bloom]")!.querySelectorAll("path")).toHaveLength(4);
  });

  it("turns cursor effects off without a fine pointer: no tilt, no magnetic offsets", () => {
    const { container } = renderHome();
    expect(container.querySelector("[data-tilt]")).toBeNull();
    expect(container.querySelector("[data-tilt-sweep]")).toBeNull();
    for (const el of container.querySelectorAll("[data-magnetic]")) expect((el as HTMLElement).style.transform).toBe("");
  });

  it("flashes only rows a poll adds, and ticks the counters", async () => {
    const row = (id: string, name: string): DashboardBooking => ({
      id,
      createdAt: "2026-10-22T04:00:00.000Z",
      clinicSlug: "lotus-clinic",
      name,
      phone: "9876543210",
      visitType: "clinic",
      date: "2026-10-22",
      slot: "Morning, 10 am – 1 pm",
      reason: "PCOS",
      status: "new",
      notes: null,
      wantsNewTime: false,
    });
    const props = { today: "2026-10-22", live: true, bookHref: "/book", onStatus: () => undefined, onLogout: () => undefined };
    const { container, rerender } = render(<Dashboard {...props} bookings={[row("a", "Asha")]} />);
    expect(container.querySelector("[data-fresh]")).toBeNull();
    rerender(<Dashboard {...props} bookings={[row("a", "Asha"), row("b", "Bina")]} />);
    await waitFor(() => expect(container.querySelectorAll("[data-fresh]")).toHaveLength(1));
    expect(container.querySelector("[data-fresh]")!.textContent).toContain("Bina");
    expect(container.querySelector("[data-fresh] [data-row-flash]")).toBeTruthy();
    const fresh = screen.getByText("New", { selector: "dt" }).nextElementSibling!;
    expect(fresh.querySelector("[data-ticker]")).toBeTruthy();
    await waitFor(() => expect(fresh.textContent).toBe("2"));
  });
});
