import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getService } from "@/lib/catalog";
import { LiveDemo } from "@/demos/render";
import { clinic, clinicWhatsAppHref } from "@/demos/lotus-clinic/data";

function renderHome() {
  const found = getService("clinic", "website");
  if (!found || found.service.status !== "live") throw new Error("clinic website demo is not live");
  return render(<LiveDemo industry={found.industry} service={found.service} page="" />);
}

describe("Lotus header", () => {
  it("links the clinic number straight to a WhatsApp chat", () => {
    expect(clinicWhatsAppHref).toBe("https://wa.me/919876543210");
    renderHome();
    const header = screen.getByRole("banner");
    const link = within(header).getByRole("link", { name: `WhatsApp ${clinic.phone}` });
    expect(link.getAttribute("href")).toBe(clinicWhatsAppHref);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(within(header).getAllByRole("link", { name: "Book a visit" }).length).toBeGreaterThan(0);
  });

  it("puts the number in the mobile menu too", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = document.getElementById("lotus-menu");
    expect(menu).toBeTruthy();
    expect(within(menu!).getByRole("link", { name: `WhatsApp ${clinic.phone}` }).getAttribute("href")).toBe(clinicWhatsAppHref);
  });
});

describe("Lotus home order", () => {
  it("runs doctor, numbers, stories, why, services, then the map", () => {
    const { container } = renderHome();
    const main = container.querySelector("main")!;
    const text = main.textContent ?? "";
    const order = ["Meet your doctor", "years of experience", "What women say about us", "A clinic that makes things easy", "Care for every stage", "Find the clinic", "Book your visit today"];
    const at = order.map((t) => text.indexOf(t));
    expect(at.every((i) => i >= 0), JSON.stringify(at)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(within(main).getByRole("link", { name: /More about Dr. Rao/ })).toBeTruthy();
    for (const s of clinic.stats) expect(within(main).getByText(s.value)).toBeTruthy();
    expect(main.querySelector("iframe")).toBeTruthy();
  });
});
