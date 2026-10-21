import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getService } from "@/lib/catalog";
import { LiveDemo } from "@/demos/render";
import { clinic } from "@/demos/lotus-clinic/data";

function renderHome() {
  const found = getService("clinic", "website");
  if (!found || found.service.status !== "live") throw new Error("clinic website demo is not live");
  return render(<LiveDemo industry={found.industry} service={found.service} page="" />);
}

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
