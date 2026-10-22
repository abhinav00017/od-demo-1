import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getService } from "@/lib/catalog";
import { LiveDemo } from "@/demos/render";
import { CountUp, formatFigure, MotionProvider, parseFigure, Reveal, RevealGroup, RevealItem } from "@/demos/lotus-clinic/Motion";
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
