import { industries as raw } from "@/content/industries";
import { LIVE_DEMOS, type DemoId } from "./demos";
import { catalogSchema, type Industry, type Service } from "./schema";

/** Validated once at import. A bad content file fails the build and the tests with a readable path. */
export const industries: Industry[] = catalogSchema.parse(raw);

export function getIndustry(slug: string): Industry | undefined {
  return industries.find((i) => i.slug === slug);
}

export function getService(industrySlug: string, serviceSlug: string) {
  const industry = getIndustry(industrySlug);
  const service = industry?.services.find((s) => s.slug === serviceSlug);
  return industry && service ? { industry, service } : undefined;
}

export function serviceHref(industry: Pick<Industry, "slug">, service: Pick<Service, "slug">) {
  return `/${industry.slug}/${service.slug}`;
}

/** Params for app/[industry]/[service]: every service of every industry. */
export function serviceParams() {
  return industries.flatMap((i) => i.services.map((s) => ({ industry: i.slug, service: s.slug })));
}

/** Params for app/[industry]/[service]/[page]: the inner pages of every live demo. */
export function demoPageParams() {
  return industries.flatMap((i) =>
    i.services.flatMap((s) =>
      s.status === "live"
        ? LIVE_DEMOS[s.demo].pages.filter((p) => p.slug !== "").map((p) => ({ industry: i.slug, service: s.slug, page: p.slug }))
        : [],
    ),
  );
}

export function getDemoPage(industrySlug: string, serviceSlug: string, page: string) {
  const found = getService(industrySlug, serviceSlug);
  if (!found || found.service.status !== "live") return undefined;
  const demo: DemoId = found.service.demo;
  const entry = LIVE_DEMOS[demo].pages.find((p) => p.slug === page);
  return entry ? { ...found, demo, page: entry.slug } : undefined;
}

/** The service after this one, wrapping to the first. Used for "Next service" on preview pages. */
export function nextService(industry: Industry, service: Service): Service {
  const i = industry.services.findIndex((s) => s.slug === service.slug);
  return industry.services[(i + 1) % industry.services.length];
}
