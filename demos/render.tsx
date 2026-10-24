import { serviceHref } from "@/lib/catalog";
import { LIVE_DEMOS, type DemoId, type DemoPage } from "@/lib/demos";
import type { Industry, Service } from "@/lib/schema";
import { clinic } from "./lotus-clinic/data";
import { LotusSite, type Nav } from "./lotus-clinic/LotusSite";
import { LotusAbout, LotusAdmin, LotusBook, LotusContact, LotusHome, LotusServices } from "./lotus-clinic/pages";
import { cafe } from "./solstice-cafe/data";
import { SolsticeSite } from "./solstice-cafe/SolsticeSite";

const LOTUS_PAGES: Record<DemoPage, (props: { nav: Nav }) => React.ReactNode> = {
  "": LotusHome,
  services: LotusServices,
  about: LotusAbout,
  contact: LotusContact,
  book: LotusBook,
  admin: LotusAdmin,
};

/** Page title for a live demo page, as the client's own site would set it. */
export function liveDemoTitle(demo: DemoId, page: string): string {
  switch (demo) {
    case "lotus-clinic": {
      const label = LIVE_DEMOS[demo].pages.find((p) => p.slug === page)?.label ?? "Home";
      return page ? `${label} | ${clinic.name}` : `${clinic.name} | Gynecologist & Obstetrician in ${clinic.city}`;
    }
    case "solstice-cafe":
      return cafe.title;
  }
}

/** Meta description for a live demo's home page, when the client's own site sets one. Lotus keeps the hub's. */
export function liveDemoDescription(demo: DemoId): string | undefined {
  return demo === "solstice-cafe" ? cafe.description : undefined;
}

export function LiveDemo({ industry, service, page }: { industry: Industry; service: Extract<Service, { status: "live" }>; page: DemoPage }) {
  const base = serviceHref(industry, service);
  const nav: Nav = { base, page, hubHref: `/${industry.slug}`, href: (p) => (p ? `${base}/${p}` : base) };
  // Each live demo has a case here. Lotus has its own page map; Solstice is a single page.
  switch (service.demo) {
    case "lotus-clinic": {
      const Page = LOTUS_PAGES[page];
      return (
        <LotusSite nav={nav}>
          <Page nav={nav} />
        </LotusSite>
      );
    }
    case "solstice-cafe":
      return <SolsticeSite hubHref={nav.hubHref} />;
  }
}
