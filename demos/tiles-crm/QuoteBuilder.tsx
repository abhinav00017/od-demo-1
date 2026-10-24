"use client";

import { ArrowLeft, CircleCheck, Copy, ExternalLink, Search, Send, Trash2, XCircle } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { areaWithWastage, boxesForArea, coverage, formatInr, quoteTotals, rupeesToPaise, validUntil } from "@/lib/crm/math";
import type { Lead, Product, QuoteWithItems } from "@/lib/crm/types";
import { api, ApiError } from "./api";
import { Empty, ErrorNote, QuoteBadge, shortDay } from "./bits";
import { AnimatePresence, m, Reveal, Row } from "./Motion";
import { go } from "./nav";
import type { LeadData, ProductsData, QuoteData } from "./types";
import { ui } from "./ui";
import { useApi } from "./useApi";

type Mode = "boxes" | "area";
type Line = { key: string; productId: string; mode: Mode; qty: string; area: string; wastage: string };

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Boxes for a line as typed: from the area with wastage, or the boxes typed (whole boxes only). */
export function lineBoxesOf(line: Pick<Line, "mode" | "qty" | "area" | "wastage">, sqftPerBox: number) {
  return line.mode === "area" ? boxesForArea(num(line.area), num(line.wastage), sqftPerBox) : Math.max(0, Math.floor(num(line.qty)));
}

function toLines(q: QuoteWithItems | undefined): Line[] {
  return (q?.items ?? []).map((i) => ({
    key: i.id,
    productId: i.productId,
    mode: i.areaSqft ? "area" : "boxes",
    qty: String(i.qtyBoxes),
    area: i.areaSqft ? String(i.areaSqft) : "",
    wastage: String(i.wastagePct),
  }));
}

/** A message for a quote that was just created, shown once the builder reopens on it. */
const flash = new Map<string, string>();

function productLine(p: Pick<Product, "brand" | "sizeMm" | "finish">) {
  return `${p.brand} · ${p.sizeMm} mm · ${p.finish}`;
}

/** Loads what the builder needs, then hands it over. A quote id opens that quote; a lead id starts a new one. */
export function QuoteBuilder({ quoteId, leadId }: { quoteId?: string; leadId?: string }) {
  const products = useApi<ProductsData>("/api/crm/products");
  const quote = useApi<QuoteData>(quoteId ? `/api/crm/quotes/${quoteId}` : null);
  const lead = useApi<LeadData>(!quoteId && leadId ? `/api/crm/leads/${leadId}` : null);
  const error = products.error ?? quote.error ?? lead.error;
  const theLead = quoteId ? quote.data?.lead : lead.data?.lead;
  if (error) return <ErrorNote message={error} />;
  if (!products.data || !theLead || (quoteId && !quote.data)) return <p className="py-10 text-center text-muted">Loading the quote…</p>;
  return <Builder products={products.data.products} lead={theLead} initial={quote.data?.quote} onChanged={quote.reload} />;
}

function Builder({ products, lead, initial, onChanged }: { products: Product[]; lead: Lead; initial?: QuoteWithItems; onChanged: () => void }) {
  const id = useId();
  const [lines, setLines] = useState<Line[]>(() => toLines(initial));
  const [discount, setDiscount] = useState(initial?.discount ? String(initial.discount / 100) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() => (initial ? (flash.get(initial.id) ?? "") : ""));
  const [confirm, setConfirm] = useState<"sold" | "lost" | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initial) flash.delete(initial.id);
  }, [initial]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const closed = initial ? initial.status === "sold" || initial.status === "lost" : false;

  // A closed quote shows what was saved, not what is being edited.
  const shown = closed ? toLines(initial) : lines;
  const priced = shown.map((l) => {
    const p = byId.get(l.productId);
    if (closed && initial) {
      const saved = initial.items.find((i) => i.id === l.key);
      return { line: l, product: p, boxes: saved?.qtyBoxes ?? 0, unit: saved?.unitPrice ?? 0, total: saved?.lineTotal ?? 0 };
    }
    const boxes = p ? lineBoxesOf(l, p.sqftPerBox) : 0;
    const unit = p?.pricePerBox ?? 0;
    return { line: l, product: p, boxes, unit, total: boxes * unit };
  });
  const totals = closed && initial ? { subtotal: initial.subtotal, discount: initial.discount, total: initial.total } : quoteTotals(priced.map((x) => x.total), rupeesToPaise(num(discount)));
  const discountTooBig = !closed && rupeesToPaise(num(discount)) > totals.subtotal;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.active && [p.name, p.sku, p.brand, p.sizeMm, p.category, p.finish].some((f) => f.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [products, query]);

  function edit(fn: (ls: Line[]) => Line[]) {
    setLines(fn);
    setDirty(true);
    setNotice("");
  }
  const update = (key: string, patch: Partial<Line>) => edit((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function add(p: Product) {
    edit((ls) => [...ls, { key: crypto.randomUUID(), productId: p.id, mode: "boxes", qty: "1", area: "", wastage: "10" }]);
    setQuery("");
  }

  const payload = () => ({
    items: lines.map((l) => (l.mode === "area" ? { productId: l.productId, areaSqft: num(l.area), wastagePct: num(l.wastage) } : { productId: l.productId, qtyBoxes: Math.floor(num(l.qty)) })),
    discount: num(discount),
    notes,
  });

  /** Saves when there is something to save. Returns the quote id, or null when saving failed. */
  async function save(): Promise<string | null> {
    if (initial && !dirty) return initial.id;
    try {
      if (!initial) {
        const { quote } = await api<{ quote: QuoteWithItems }>("/api/crm/quotes", { method: "POST", body: { leadId: lead.id, ...payload() } });
        setDirty(false);
        return quote.id;
      }
      await api(`/api/crm/quotes/${initial.id}`, { method: "PUT", body: payload() });
      setDirty(false);
      return initial.id;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the quote. Try again.");
      return null;
    }
  }

  async function run(label: string, fn: (quoteId: string) => Promise<string | void>) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const quoteId = await save();
      if (!quoteId) return;
      const message = await fn(quoteId);
      if (!initial) {
        // The new quote has an id now: open it, so a reload or Back lands on it. The message waits for it.
        if (message) flash.set(quoteId, message);
        go({ v: "quote", id: quoteId }, { replace: true });
        return;
      }
      if (message) setNotice(message);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work. Try again.");
    } finally {
      setBusy(undefined);
      setConfirm(null);
    }
  }

  const publicUrl = initial ? `${typeof window === "undefined" ? "" : window.location.origin}/tiles/crm/q/${initial.number}?k=${initial.publicKey}` : "";

  return (
    <Reveal>
      <button type="button" onClick={() => go({ v: "lead", id: lead.id })} className={`-ml-3 ${ui.quiet}`}>
        <ArrowLeft aria-hidden className="size-4" strokeWidth={2} />
        {lead.name}
      </button>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{initial ? `Quote ${initial.number}` : "New quote"}</h1>
        {initial ? <QuoteBadge status={initial.status} /> : null}
      </div>
      <p className="mt-1 text-muted">
        For {lead.name}
        {initial ? ` · made ${shortDay(initial.createdAt)}` : ""}
        {initial?.sentAt ? ` · sent ${shortDay(initial.sentAt)}` : ""}
        {initial?.soldAt ? ` · sold ${shortDay(initial.soldAt)}` : ""}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div>
          {!closed ? (
            <div className="relative">
              <label htmlFor={`${id}-search`} className={ui.label}>
                Add a product
              </label>
              <div className="relative mt-1.5">
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" strokeWidth={2} />
                <input
                  id={`${id}-search`}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, SKU, size or brand"
                  autoComplete="off"
                  className={`${ui.input.replace("mt-1.5 ", "")} pl-11`}
                  aria-controls={`${id}-results`}
                />
              </div>
              {query.trim() ? (
                <ul id={`${id}-results`} aria-label="Matching products" className={`mt-2 max-h-80 divide-y divide-line overflow-y-auto ${ui.card}`}>
                  {matches.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-muted">No active product matches.</li>
                  ) : (
                    matches.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => add(p)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-crm-soft">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">{p.name}</span>
                            <span className="block truncate text-xs text-muted">
                              {p.sku} · {productLine(p)}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-sm">
                            <span className="block font-semibold text-ink tabular-nums">{formatInr(p.pricePerBox)}/box</span>
                            <span className="block text-xs text-muted">{p.sqftPerBox} sq ft/box</span>
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          ) : null}

          {shown.length === 0 ? (
            <div className="mt-5">
              <Empty>Search the catalogue above and tap a product to add it.</Empty>
            </div>
          ) : (
            <ul aria-label="Quote lines" className="mt-5 space-y-3">
              <AnimatePresence initial={false}>
                {priced.map(({ line, product, boxes, unit, total }) => (
                  <Row key={line.key} className={`p-4 ${ui.card}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{product?.name ?? "Product"}</p>
                        <p className="text-xs text-muted">{product ? `${product.sku} · ${productLine(product)}` : ""}</p>
                        <p className="mt-1 text-sm text-muted tabular-nums">
                          {formatInr(unit)}/box · {product?.sqftPerBox ?? "?"} sq ft/box
                        </p>
                      </div>
                      {!closed ? (
                        <button type="button" aria-label={`Remove ${product?.name ?? "line"}`} onClick={() => edit((ls) => ls.filter((l) => l.key !== line.key))} className="-m-1 rounded-lg p-2 text-muted hover:text-crm-error">
                          <Trash2 aria-hidden className="size-4" strokeWidth={2} />
                        </button>
                      ) : null}
                    </div>

                    {!closed ? (
                      <div className="mt-3">
                        <div role="group" aria-label="Quantity by" className="inline-flex rounded-xl bg-canvas p-1">
                          {(["boxes", "area"] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              aria-pressed={line.mode === mode}
                              onClick={() => update(line.key, { mode })}
                              className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${line.mode === mode ? "bg-white text-crm-accent shadow-sm" : "text-muted"}`}
                            >
                              {mode === "boxes" ? "Boxes" : "Area (sq ft)"}
                            </button>
                          ))}
                        </div>
                        {line.mode === "boxes" ? (
                          <label className="mt-3 block max-w-40 text-sm font-semibold text-ink">
                            Boxes
                            <input type="number" inputMode="numeric" min={1} step={1} value={line.qty} onChange={(e) => update(line.key, { qty: e.target.value })} className={ui.input} />
                          </label>
                        ) : (
                          <div className="mt-3 grid max-w-sm grid-cols-2 gap-3">
                            <label className="block text-sm font-semibold text-ink">
                              Area, sq ft
                              <input type="number" inputMode="decimal" min={0} step="any" value={line.area} onChange={(e) => update(line.key, { area: e.target.value })} className={ui.input} />
                            </label>
                            <label className="block text-sm font-semibold text-ink">
                              Wastage %
                              <input type="number" inputMode="decimal" min={0} max={50} step="any" value={line.wastage} onChange={(e) => update(line.key, { wastage: e.target.value })} className={ui.input} />
                            </label>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-3">
                      <p className="text-sm text-muted" aria-live="polite">
                        <span className="font-semibold text-ink tabular-nums">{boxes} {boxes === 1 ? "box" : "boxes"}</span>
                        {product ? ` · covers ${coverage(boxes, product.sqftPerBox)} sq ft` : ""}
                        {line.mode === "area" && num(line.area) > 0 ? ` · needs ${areaWithWastage(num(line.area), num(line.wastage))} sq ft with wastage` : ""}
                      </p>
                      <p className="font-bold text-ink tabular-nums">{formatInr(total)}</p>
                    </div>
                  </Row>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {!closed ? (
            <div className="mt-5">
              <label htmlFor={`${id}-notes`} className={ui.label}>
                Notes on the quote <span className="font-normal text-muted">(optional, the customer sees them)</span>
              </label>
              <textarea
                id={`${id}-notes`}
                rows={2}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setDirty(true);
                }}
                placeholder="Delivery, laying, adhesive"
                className={ui.input}
              />
            </div>
          ) : initial?.notes ? (
            <p className="mt-5 rounded-xl bg-white p-4 text-sm text-ink ring-1 ring-line">{initial.notes}</p>
          ) : null}
        </div>

        <m.aside layout className={`p-5 lg:sticky lg:top-4 ${ui.card}`} aria-label="Quote total">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-semibold text-ink tabular-nums">{formatInr(totals.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>
                {closed ? (
                  <span className="text-muted">Discount</span>
                ) : (
                  <label htmlFor={`${id}-discount`} className="text-muted">
                    Discount, ₹
                  </label>
                )}
              </dt>
              <dd>
                {closed ? (
                  <span className="font-semibold text-ink tabular-nums">{formatInr(totals.discount)}</span>
                ) : (
                  <input
                    id={`${id}-discount`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={discount}
                    onChange={(e) => {
                      setDiscount(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="0"
                    aria-invalid={discountTooBig || undefined}
                    className={`${ui.input.replace("mt-1.5 ", "")} w-32 py-1.5 text-right`}
                  />
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-3">
              <dt className="text-base font-bold text-ink">Total</dt>
              <dd className="text-2xl font-bold text-ink tabular-nums">{formatInr(totals.total)}</dd>
            </div>
          </dl>
          {discountTooBig ? <p className={ui.error}>The discount is more than the quote.</p> : null}
          {initial ? <p className="mt-2 text-xs text-muted">Valid until {shortDay(validUntil(initial))}.</p> : null}

          {error ? (
            <div className="mt-4">
              <ErrorNote message={error} />
            </div>
          ) : null}
          {notice && !closed ? (
            <p role="status" className="mt-4 rounded-xl bg-crm-ok-soft px-4 py-3 text-sm font-semibold text-crm-ok">
              {notice}
            </p>
          ) : null}

          {!closed ? (
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                className={ui.primary}
                disabled={Boolean(busy) || lines.length === 0 || discountTooBig}
                onClick={() =>
                  void run("send", async (quoteId) => {
                    const res = await api<{ message: { toMasked: string; provider: string } }>(`/api/crm/quotes/${quoteId}/send`, { method: "POST" });
                    return `Sent on WhatsApp to ${res.message.toMasked}${res.message.provider === "fake" ? " (demo, not delivered)" : ""}.`;
                  })
                }
              >
                <Send aria-hidden className="size-4" strokeWidth={2} />
                {busy === "send" ? "Sending…" : initial?.status === "sent" ? "Send again on WhatsApp" : "Send on WhatsApp"}
              </button>
              <button type="button" className={ui.secondary} disabled={Boolean(busy) || lines.length === 0 || discountTooBig || (initial && !dirty)} onClick={() => void run("save", async () => "Saved.")}>
                {busy === "save" ? "Saving…" : initial && !dirty ? "Saved" : initial ? "Save changes" : "Save draft"}
              </button>
              {confirm ? (
                <div role="group" aria-label="Confirm" className="rounded-xl bg-canvas p-3 text-sm">
                  <p className="font-semibold text-ink">
                    {confirm === "sold" ? `Mark sold? ${lead.name} becomes a customer.` : "Mark this quote lost?"}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className={ui.primary}
                      disabled={Boolean(busy)}
                      onClick={() =>
                        void run(confirm, async (quoteId) => {
                          await api(`/api/crm/quotes/${quoteId}/status`, { method: "POST", body: { status: confirm } });
                          return confirm === "sold" ? `Sold. ${lead.name} is now a customer.` : "Marked lost.";
                        })
                      }
                    >
                      Yes, mark {confirm}
                    </button>
                    <button type="button" className={ui.secondary} onClick={() => setConfirm(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className={ui.secondary} disabled={Boolean(busy) || lines.length === 0} onClick={() => setConfirm("sold")}>
                    <CircleCheck aria-hidden className="size-4 text-crm-ok" strokeWidth={2} />
                    Mark sold
                  </button>
                  <button type="button" className={ui.secondary} disabled={Boolean(busy) || lines.length === 0} onClick={() => setConfirm("lost")}>
                    <XCircle aria-hidden className="size-4 text-muted" strokeWidth={2} />
                    Mark lost
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${initial?.status === "sold" ? "bg-crm-ok-soft text-crm-ok" : "bg-chip text-muted"}`}>
              {initial?.status === "sold" ? `Sold on ${shortDay(initial.soldAt ?? initial.createdAt)}. ${lead.name} is a customer.` : "This quote was lost."}
            </p>
          )}

          {initial ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-sm font-semibold text-ink">Customer link</p>
              <p className="mt-0.5 text-xs text-muted">The printable quote page. It goes out with the WhatsApp message.</p>
              <div className="mt-2 flex gap-2">
                <a href={publicUrl} target="_blank" rel="noopener" className={`flex-1 ${ui.secondary}`}>
                  <ExternalLink aria-hidden className="size-4" strokeWidth={2} />
                  Open
                </a>
                <button
                  type="button"
                  className={`flex-1 ${ui.secondary}`}
                  onClick={() => {
                    void navigator.clipboard?.writeText(publicUrl).then(() => setCopied(true), () => undefined);
                  }}
                >
                  <Copy aria-hidden className="size-4" strokeWidth={2} />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : null}
        </m.aside>
      </div>
    </Reveal>
  );
}
