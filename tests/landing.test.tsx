import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { industries } from "@/lib/catalog";
import { Landing } from "@/components/sections/Landing";

it("landing lists all five industries with links, plus the More coming card", () => {
  render(<Landing industries={industries} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Pick a business to see what we build/);
  expect(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "Making business easy and stress-free.")).toBeTruthy();
  const list = screen.getByRole("list", { name: "Businesses" });
  expect(within(list).getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Clinic", "Cafe", "Real estate", "Ticketing platform", "Tiles & showrooms", "More coming"]);
  expect(within(list).getByRole("link", { name: /Clinic/ }).getAttribute("href")).toBe("/clinic");
  expect(within(list).getByRole("link", { name: /Cafe/ }).getAttribute("href")).toBe("/cafe");
  const realEstate = within(list).getByRole("link", { name: /Real estate/ });
  expect(realEstate.getAttribute("href")).toBe("/real-estate");
  expect(within(realEstate).getByText(/6 services · 1 live demo/)).toBeTruthy();
  const ticketing = within(list).getByRole("link", { name: /Ticketing platform/ });
  expect(ticketing.getAttribute("href")).toBe("/ticketing-platform");
  expect(within(ticketing).getByText(/6 services · 1 live demo/)).toBeTruthy();
  const tiles = within(list).getByRole("link", { name: /Tiles & showrooms/ });
  expect(tiles.getAttribute("href")).toBe("/tiles");
  expect(within(tiles).getByText("For showrooms that want every walk-in quoted, followed up and closed.")).toBeTruthy();
  expect(within(tiles).getByText(/6 services · 1 live demo/)).toBeTruthy();
  // "More coming" is not a link.
  expect(within(list).getAllByRole("link")).toHaveLength(5);
});
