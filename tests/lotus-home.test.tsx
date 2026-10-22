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
    expect(clinic.phone).toBe("+91 73821 30063");
    expect(clinicWhatsAppHref).toBe("https://wa.me/917382130063");
    renderHome();
    const header = screen.getByRole("banner");
    const link = within(header).getByRole("link", { name: `WhatsApp ${clinic.phone}` });
    expect(link.getAttribute("href")).toBe(clinicWhatsAppHref);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(within(header).getAllByRole("link", { name: "Book an Appointment" }).length).toBeGreaterThan(0);
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
  it("runs doctor, numbers, services, why, stories, then the map, with no CTA band", () => {
    const { container } = renderHome();
    const main = container.querySelector("main")!;
    const text = main.textContent ?? "";
    const order = [clinic.doctor.name, "Expert care for women", "Years of Experience", "Our Specialities", "Why Choose Lotus Women's Clinic", "What Our Patients Say", "Visit Us"];
    const at = order.map((t) => text.indexOf(t));
    expect(at.every((i) => i >= 0), JSON.stringify(at)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(text).not.toContain("Book your visit today");
    expect(within(main).getByRole("link", { name: /More About Dr. Rao/ })).toBeTruthy();
    const numbers = main.querySelector('[aria-labelledby="numbers-heading"]') as HTMLElement;
    for (const s of clinic.stats) expect(within(numbers).getByText(s.value)).toBeTruthy();
    expect(main.querySelector("iframe")).toBeTruthy();
  });

  it("keeps the home short: 2 stories, 4 reasons, 4 services, no extras", () => {
    const { container } = renderHome();
    const main = container.querySelector("main")!;
    const list = (id: string) => main.querySelector(`[aria-labelledby="${id}"] ul`)!.children.length;
    expect(list("stories-heading")).toBe(2);
    expect(list("why-heading")).toBe(4);
    expect(list("services-heading")).toBe(4);
    expect(main.textContent).not.toContain("Speaks");
  });
});
