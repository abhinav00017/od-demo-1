import type { Mock } from "@/lib/schema";
import { BrowserFrame } from "./Frames";

type Catalogue = Extract<Mock, { kind: "catalogue" }>;

// Tile swatches are mock art, not UI colour: each is a small drawn surface, so they sit outside the token palette.
const SWATCH: Record<Catalogue["tiles"][number]["swatch"], string> = {
  marble: "linear-gradient(135deg, #f7f5f2 0%, #e9e4dc 45%, #f7f5f2 55%, #ddd6cb 100%)",
  oak: "repeating-linear-gradient(90deg, #c89f6e 0 10px, #b88b58 10px 12px, #cfa776 12px 26px)",
  slate: "linear-gradient(160deg, #6b7280 0%, #4b5563 60%, #374151 100%)",
  sage: "linear-gradient(180deg, #b7c4ad 0%, #9fb091 100%)",
  terracotta: "repeating-linear-gradient(0deg, #b25e3c 0 14px, #f3e9df 14px 16px)",
  ivory: "linear-gradient(135deg, #fbf7ef 0%, #f1e9da 100%)",
};

/** A tile showroom's web page: shop bar, headline, room filters and a grid of tiles with price per box. */
export function CatalogueMock({ mock }: { mock: Catalogue }) {
  return (
    <BrowserFrame url={mock.url}>
      <div className="bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-ink">{mock.name}</span>
          <span className="rounded-full bg-crm-accent px-3 py-1 text-xs font-semibold text-white">{mock.cta}</span>
        </div>
        <p className="mt-5 text-xl leading-tight font-bold text-ink sm:text-2xl">{mock.headline}</p>
        <p className="mt-1.5 text-sm text-muted">{mock.sub}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {mock.filters.map((f, i) => (
            <span key={f} className={`rounded-full px-3 py-1 text-xs font-semibold ${i === 0 ? "bg-crm-accent text-white" : "bg-canvas text-ink"}`}>
              {f}
            </span>
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {mock.tiles.map((t) => (
            <li key={t.name} className="overflow-hidden rounded-xl ring-1 ring-line">
              <span aria-hidden className="block aspect-[4/3]" style={{ background: SWATCH[t.swatch] }} />
              <span className="block p-2.5">
                <span className="block truncate text-sm font-semibold text-ink">{t.name}</span>
                <span className="block truncate text-[11px] text-muted">{t.detail}</span>
                <span className="mt-1 block text-sm font-bold text-ink tabular-nums">{t.price}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </BrowserFrame>
  );
}
