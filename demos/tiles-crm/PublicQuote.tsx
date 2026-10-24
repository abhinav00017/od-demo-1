"use client";

import { Printer } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatInr } from "@/lib/crm/math";

export type PublicQuoteData = {
  shop: { name: string; area: string; city: string; phoneDisplay: string; hours: string };
  quote: {
    number: string;
    status: "draft" | "sent" | "sold" | "lost";
    date: string;
    validUntil: string;
    /** Past its validity date and not sold. Worked out on the server, so the page renders the same everywhere. */
    expired: boolean;
    customerName: string;
    subtotal: number;
    discount: number;
    total: number;
    notes: string;
    items: {
      name: string;
      brand: string;
      sizeMm: string;
      finish: string;
      qtyBoxes: number;
      areaSqft: number | null;
      wastagePct: number;
      sqftCovered: number | null;
      unitPrice: number;
      lineTotal: number;
    }[];
  };
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** The printed quote itself: shop header, lines, totals, validity. Pure, so tests can render it with data. */
export function QuoteSheet({ data }: { data: PublicQuoteData }) {
  const { shop, quote } = data;
  const expired = quote.expired;
  return (
    <article className="mx-auto max-w-3xl bg-white p-6 ring-1 ring-line sm:rounded-3xl sm:p-10 print:max-w-none print:p-0 print:ring-0">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="text-2xl font-bold tracking-tight text-ink">{shop.name}</p>
          <p className="mt-1 text-sm text-muted">
            {shop.area}, {shop.city}
          </p>
          <p className="text-sm text-muted">
            {shop.phoneDisplay} · {shop.hours}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold tracking-wide text-crm-accent uppercase">Quotation</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{quote.number}</h1>
          <p className="mt-1 text-sm text-muted">Date: {day(quote.date)}</p>
          <p className={`text-sm ${expired ? "font-semibold text-crm-error" : "text-muted"}`}>
            {expired ? "Expired on" : "Valid until"} {day(quote.validUntil)}
          </p>
        </div>
      </header>

      <p className="mt-6 text-sm text-muted">
        Prepared for <span className="font-semibold text-ink">{quote.customerName}</span>
      </p>

      {/* Phones get one card per line; wider screens and print get the table. */}
      <ul className="mt-4 divide-y divide-line border-y border-line sm:hidden print:hidden" aria-label={`Items in quote ${quote.number}`}>
        {quote.items.map((item, i) => (
          <li key={i} className="py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-ink">{item.name}</p>
              <p className="shrink-0 font-semibold text-ink tabular-nums">{formatInr(item.lineTotal)}</p>
            </div>
            <p className="text-xs text-muted">
              {item.brand} · {item.sizeMm} mm · {item.finish}
            </p>
            <p className="mt-1 text-muted tabular-nums">
              {item.qtyBoxes} {item.qtyBoxes === 1 ? "box" : "boxes"} × {formatInr(item.unitPrice)}
              {item.sqftCovered !== null ? ` · covers ${item.sqftCovered} sq ft` : ""}
            </p>
            {item.areaSqft ? (
              <p className="text-xs text-muted">
                For {item.areaSqft} sq ft + {item.wastagePct}% wastage
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-4 hidden sm:block print:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Items in quote {quote.number}</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Product
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                Boxes
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                Covers
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                Rate / box
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={i} className="border-b border-line align-top">
                <td className="py-3 pr-3">
                  <p className="font-semibold text-ink">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.brand} · {item.sizeMm} mm · {item.finish}
                  </p>
                  {item.areaSqft ? (
                    <p className="text-xs text-muted">
                      For {item.areaSqft} sq ft + {item.wastagePct}% wastage
                    </p>
                  ) : null}
                </td>
                <td className="py-3 pr-3 text-right text-ink tabular-nums">{item.qtyBoxes}</td>
                <td className="py-3 pr-3 text-right text-muted tabular-nums">{item.sqftCovered !== null ? `${item.sqftCovered} sq ft` : ""}</td>
                <td className="py-3 pr-3 text-right text-ink tabular-nums">{formatInr(item.unitPrice)}</td>
                <td className="py-3 text-right font-semibold text-ink tabular-nums">{formatInr(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between gap-6">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-ink tabular-nums">{formatInr(quote.subtotal)}</dd>
        </div>
        {quote.discount > 0 ? (
          <div className="flex justify-between gap-6">
            <dt className="text-muted">Discount</dt>
            <dd className="text-ink tabular-nums">−{formatInr(quote.discount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-6 border-t border-line pt-3">
          <dt className="text-base font-bold text-ink">Total</dt>
          <dd className="text-xl font-bold text-ink tabular-nums">{formatInr(quote.total)}</dd>
        </div>
      </dl>

      {quote.notes ? <p className="mt-8 rounded-xl bg-canvas p-4 text-sm text-ink print:bg-white print:p-0">{quote.notes}</p> : null}

      <footer className="mt-10 border-t border-line pt-4 text-xs text-muted">
        <p>Prices are per box as quoted, valid for 7 days. Box counts are rounded up to whole boxes.</p>
        <p className="mt-1">Demo by onlydevs. {shop.name} is a made-up showroom.</p>
      </footer>
    </article>
  );
}

/** /tiles/crm/q/[number]?k=...: loads one quote with the link's key and shows it, ready to print. */
export function PublicQuote() {
  const params = useParams<{ number: string }>();
  const search = useSearchParams();
  const number = params?.number ?? "";
  const key = search.get("k") ?? "";
  const [state, setState] = useState<{ data?: PublicQuoteData; error?: string }>({});

  useEffect(() => {
    let alive = true;
    fetch(`/api/crm/public/quotes/${encodeURIComponent(number)}?k=${encodeURIComponent(key)}`, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Partial<PublicQuoteData> & { ok?: boolean; error?: string };
        if (!alive) return;
        if (res.ok && body.ok && body.quote && body.shop) setState({ data: { quote: body.quote, shop: body.shop } });
        else setState({ error: body.error ?? "This quote link is not valid." });
      })
      .catch(() => alive && setState({ error: "Could not load the quote. Check your connection and try again." }));
    return () => {
      alive = false;
    };
  }, [number, key]);

  if (state.error)
    return (
      <p role="alert" className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-6 text-center text-ink ring-1 ring-line">
        {state.error}
      </p>
    );
  if (!state.data) return <p className="py-16 text-center text-muted">Loading the quote…</p>;
  return (
    <>
      <div className="mx-auto mb-4 flex max-w-3xl justify-end px-4 sm:px-0 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-crm-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-crm-accent-strong"
        >
          <Printer aria-hidden className="size-4" strokeWidth={2} />
          Print / Save as PDF
        </button>
      </div>
      <QuoteSheet data={state.data} />
    </>
  );
}
