import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

// next/font only works inside the Next compiler. In tests every font is a stub with class names.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font-stub", variable: "font-stub-variable", style: { fontFamily: "stub" } });
  return { Fraunces: font, Plus_Jakarta_Sans: font };
});
