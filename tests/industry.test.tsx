import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { getIndustry } from "@/lib/catalog";
import { IndustryView } from "@/components/sections/IndustryView";

it("clinic page lists its 6 services in the pitch order, each linked to its demo", () => {
  const clinic = getIndustry("clinic")!;
  render(<IndustryView industry={clinic} />);
  const list = screen.getByRole("list", { name: "Clinic services" });
  expect(within(list).getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
    "Website",
    "Google Business Profile",
    "WhatsApp automation",
    "Online consultations",
    "Offers and packages",
    "Patient records",
  ]);
  const links = within(list).getAllByRole("link");
  expect(links.map((a) => a.getAttribute("href"))).toEqual([
    "/clinic/website",
    "/clinic/google-business-profile",
    "/clinic/whatsapp-automation",
    "/clinic/online-consultations",
    "/clinic/offers-and-packages",
    "/clinic/patient-records",
  ]);
  expect(within(links[0]).getByText("Live demo")).toBeTruthy();
  expect(links.slice(1).every((a) => within(a).queryByText("Preview"))).toBe(true);
});

it("cafe page lists its 6 services in order, with Website as the live demo", () => {
  render(<IndustryView industry={getIndustry("cafe")!} />);
  const list = screen.getByRole("list", { name: "Cafe services" });
  const links = within(list).getAllByRole("link");
  expect(links[0].getAttribute("href")).toBe("/cafe/website");
  expect(within(links[0]).getByText("Live demo")).toBeTruthy();
  expect(within(links[0]).getByText("Open live demo")).toBeTruthy();
  expect(links.slice(1).every((a) => within(a).queryByText("Preview") && within(a).queryByText("See preview"))).toBe(true);
  expect(within(list).getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
    "Website",
    "Google Business Profile",
    "WhatsApp ordering",
    "Digital menu with QR",
    "Offers and loyalty",
    "Daily sales summary",
  ]);
});
