import { serviceHref } from "@/lib/catalog";
import { LIVE_DEMOS, type DemoId, type DemoPage } from "@/lib/demos";
import type { Industry, Service } from "@/lib/schema";
import { clinic } from "./lotus-clinic/data";
import { LotusSite, type Nav } from "./lotus-clinic/LotusSite";
import { LotusAbout, LotusAdmin, LotusBook, LotusContact, LotusHome, LotusServices } from "./lotus-clinic/pages";
import { cafe } from "./solstice-cafe/data";
import { SolsticeSite } from "./solstice-cafe/SolsticeSite";
import { site as sky49 } from "./sky49/data";
import { Sky49Site } from "./sky49/Sky49Site";

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
    case "sky49":
      return sky49.title;
  }
}

/** Meta description for a live demo's home page, when the client's own site sets one. Lotus keeps the hub's. */
export function liveDemoDescription(demo: DemoId): string | undefined {
  switch (demo) {
    case "solstice-cafe":
      return cafe.description;
    case "sky49":
      return sky49.description;
    default:
      return undefined;
  }
}

export function LiveDemo({ industry, service, page }: { industry: Industry; service: Extract<Service, { status: "live" }>; page: DemoPage }) {
  const base = serviceHref(industry, service);
  const nav: Nav = { base, page, hubHref: `/${industry.slug}`, href: (p) => (p ? `${base}/${p}` : base) };
  // Each live demo has a case here. Lotus has its own page map; Solstice and Sky49 are single pages.
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
    case "sky49":
      return <Sky49Site hubHref={nav.hubHref} />;
  }
}
