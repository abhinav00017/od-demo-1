import type { Metadata, Viewport } from "next";
import { fraunces, jakarta } from "@/lib/fonts";
import "./globals.css";

// Every page is data from content/ read at build time. Fail the build if any route stops being fully static.
export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: { default: "onlydevs demos", template: "%s | onlydevs demos" },
  description: "Making business easy and stress-free. See what onlydevs builds for clinics and cafes.",
  applicationName: "onlydevs demos",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#F2F7F8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">{children}</body>
    </html>
  );
}
