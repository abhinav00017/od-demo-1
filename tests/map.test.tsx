import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClinicMap, directionsUrl, mapEmbedUrl, VisitBlock } from "@/demos/lotus-clinic/ClinicMap";
import { clinic } from "@/demos/lotus-clinic/data";

describe("Lotus map", () => {
  it("builds the keyless embed and directions URLs from mapQuery", () => {
    expect(mapEmbedUrl()).toBe("https://www.google.com/maps?q=Siripuram%20Junction%2C%20Visakhapatnam&output=embed");
    expect(directionsUrl()).toBe("https://maps.google.com/?q=Siripuram%20Junction%2C%20Visakhapatnam");
  });

  it("lazy loads a titled iframe", () => {
    const { container } = render(<ClinicMap />);
    const frame = container.querySelector("iframe");
    expect(frame?.getAttribute("loading")).toBe("lazy");
    expect(frame?.getAttribute("title")).toContain(clinic.name);
    expect(frame?.getAttribute("src")).toBe(mapEmbedUrl());
  });

  it("shows address, hours, phone and a directions link next to the map", () => {
    render(<VisitBlock />);
    expect(screen.getByText(clinic.address[0])).toBeTruthy();
    expect(screen.getByText(clinic.phone)).toBeTruthy();
    expect(screen.getByText(/Monday to Saturday/)).toBeTruthy();
    const link = screen.getByRole("link", { name: /Get Directions/ });
    expect(link.getAttribute("href")).toBe(directionsUrl());
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
