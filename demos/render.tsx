import { serviceHref } from "@/lib/catalog";
import { LIVE_DEMOS, type DemoId, type DemoPage } from "@/lib/demos";
import type { Industry, Service } from "@/lib/schema";
import { clinic } from "./lotus-clinic/data";
import { LotusSite, type Nav } from "./lotus-clinic/LotusSite";
import { LotusAbout, LotusBook, LotusContact, LotusHome, LotusServices } from "./lotus-clinic/pages";

const LOTUS_PAGES: Record<DemoPage, (props: { nav: Nav }) => React.ReactNode> = {
  "": LotusHome,
  services: LotusServices,
  about: LotusAbout,
  contact: LotusContact,
  book: LotusBook,
};

/** Page title for a live demo page, as the client's own site would set it. */
export function liveDemoTitle(demo: DemoId, page: string): string {
  const label = LIVE_DEMOS[demo].pages.find((p) => p.slug === page)?.label ?? "Home";
  return page ? `${label} | ${clinic.name}` : `${clinic.name} | ${clinic.doctor.name}, ${clinic.city}`;
}

export function LiveDemo({ industry, service, page }: { industry: Industry; service: Extract<Service, { status: "live" }>; page: DemoPage }) {
  const base = serviceHref(industry, service);
  const nav: Nav = { base, page, hubHref: `/${industry.slug}`, href: (p) => (p ? `${base}/${p}` : base) };
  // One live demo today. A second one adds a case here and its own page map.
  switch (service.demo) {
    case "lotus-clinic": {
      const Page = LOTUS_PAGES[page];
      return (
        <LotusSite nav={nav}>
          <Page nav={nav} />
        </LotusSite>
      );
    }
  }
}
