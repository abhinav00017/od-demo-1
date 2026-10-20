import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { industries } from "@/lib/catalog";
import { Landing } from "@/components/sections/Landing";

it("landing lists both industries with links, plus the More coming card", () => {
  render(<Landing industries={industries} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Pick a business to see what we build/);
  expect(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "Making business easy and stress-free.")).toBeTruthy();
  const list = screen.getByRole("list", { name: "Businesses" });
  expect(within(list).getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Clinic", "Cafe", "More coming"]);
  expect(within(list).getByRole("link", { name: /Clinic/ }).getAttribute("href")).toBe("/clinic");
  expect(within(list).getByRole("link", { name: /Cafe/ }).getAttribute("href")).toBe("/cafe");
  // "More coming" is not a link.
  expect(within(list).getAllByRole("link")).toHaveLength(2);
});
