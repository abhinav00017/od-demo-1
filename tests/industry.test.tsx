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

it("real estate page lists its 6 services, with Website as the live demo", () => {
  render(<IndustryView industry={getIndustry("real-estate")!} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("What we build for real estate developers");
  const list = screen.getByRole("list", { name: "Real estate services" });
  const links = within(list).getAllByRole("link");
  expect(links).toHaveLength(6);
  expect(links[0].getAttribute("href")).toBe("/real-estate/website");
  expect(within(links[0]).getByText("Open live demo")).toBeTruthy();
  expect(links.slice(1).every((a) => within(a).queryByText("See preview"))).toBe(true);
});

it("ticketing platform page lists its 6 services, with Ticketing platform as the live demo", () => {
  render(<IndustryView industry={getIndustry("ticketing-platform")!} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("What we build for event organisers and venues");
  const list = screen.getByRole("list", { name: "Ticketing platform services" });
  const links = within(list).getAllByRole("link");
  expect(links).toHaveLength(6);
  expect(links[0].getAttribute("href")).toBe("/ticketing-platform/ticketing-platform");
  expect(within(links[0]).getByText("Open live demo")).toBeTruthy();
  expect(links.slice(1).every((a) => within(a).queryByText("See preview"))).toBe(true);
});

it("tiles page lists its 6 services, with CRM as the live demo", () => {
  render(<IndustryView industry={getIndustry("tiles")!} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("What we build for tile and sanitaryware showrooms");
  const list = screen.getByRole("list", { name: "Tiles & showrooms services" });
  const links = within(list).getAllByRole("link");
  expect(links).toHaveLength(6);
  expect(links[0].getAttribute("href")).toBe("/tiles/crm");
  expect(within(links[0]).getByText("Open live demo")).toBeTruthy();
  expect(links.slice(1).every((a) => within(a).queryByText("See preview"))).toBe(true);
});
