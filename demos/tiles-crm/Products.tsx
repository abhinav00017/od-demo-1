"use client";

import { Plus, Search } from "lucide-react";
import { useId, useMemo, useState, type FormEvent } from "react";
import { formatInr } from "@/lib/crm/math";
import { CATEGORIES, type Category, type Product } from "@/lib/crm/types";
import { api, ApiError } from "./api";
import { Chips, Empty, ErrorNote } from "./bits";
import { Dialog } from "./Dialog";
import { AnimatePresence, m, Reveal, Row } from "./Motion";
import type { ProductsData } from "./types";
import { ui } from "./ui";
import { useApi } from "./useApi";

const CATEGORY_LABEL: Record<Category, string> = { floor: "Floor", wall: "Wall", outdoor: "Outdoor", bathroom: "Bathroom", kitchen: "Kitchen" };

/** Sq ft per box from the tile size and pieces: 600x600 x 4 = 15.5. Null when the size is not readable. */
export function sqftFromSize(sizeMm: string, pieces: number) {
  const m = /^(\d{2,4})\s*[x×*]\s*(\d{2,4})$/i.exec(sizeMm.trim());
  if (!m || !(pieces > 0)) return null;
  return Math.round(((Number(m[1]) * Number(m[2]) * pieces) / 92903.04) * 100) / 100;
}

/** The catalogue: search, filter by category, add, edit, switch a product on or off. */
export function Products() {
  const id = useId();
  const { data, error, setData } = useApi<ProductsData>("/api/crm/products");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [toggleError, setToggleError] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.products ?? []).filter(
      (p) => (category === "all" || p.category === category) && (!q || [p.name, p.sku, p.brand, p.sizeMm, p.finish].some((f) => f.toLowerCase().includes(q))),
    );
  }, [data, query, category]);

  function replace(p: Product) {
    if (!data) return;
    const exists = data.products.some((x) => x.id === p.id);
    setData({ ...data, products: exists ? data.products.map((x) => (x.id === p.id ? p : x)) : [p, ...data.products] });
  }

  async function toggle(p: Product) {
    setToggleError("");
    try {
      const { product } = await api<{ product: Product }>(`/api/crm/products/${p.id}`, { method: "PATCH", body: { active: !p.active } });
      replace(product);
    } catch (err) {
      setToggleError(err instanceof ApiError ? err.message : "Could not change that product.");
    }
  }

  if (!data) return error ? <ErrorNote message={error} /> : <p className="py-10 text-center text-muted">Loading products…</p>;

  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Products</h1>
          <p className="mt-1 text-muted">
            {data.products.filter((p) => p.active).length} active of {data.products.length}. Prices are per box.
          </p>
        </div>
        <button type="button" className={ui.primary} onClick={() => setEditing("new")}>
          <Plus aria-hidden className="size-4" strokeWidth={2.5} />
          Add product
        </button>
      </div>

      <div className="relative mt-5">
        <label htmlFor={`${id}-q`} className="sr-only">
          Search products
        </label>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" strokeWidth={2} />
        <input id={`${id}-q`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, SKU, size or brand" className={`${ui.input.replace("mt-1.5 ", "")} pl-11`} />
      </div>
      <div className="mt-3">
        <Chips label="Category" value={category} onChange={setCategory} options={[{ value: "all" as const, label: "All" }, ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))]} />
      </div>
      {toggleError ? (
        <div className="mt-3">
          <ErrorNote message={toggleError} />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-5">
          <Empty>No product matches.</Empty>
        </div>
      ) : (
        <m.ul layout aria-label="Products" className={`mt-5 divide-y divide-line overflow-hidden ${ui.card}`}>
          <AnimatePresence initial={false}>
            {rows.map((p) => (
              <Row key={p.id} className="flex items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => setEditing(p)} className="min-w-0 flex-1 text-left">
                  <span className={`block truncate font-semibold ${p.active ? "text-ink" : "text-muted"}`}>
                    {p.name}
                    {!p.active ? <span className="ml-2 text-xs font-semibold text-muted">Off</span> : null}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {p.sku} · {CATEGORY_LABEL[p.category]} · {p.brand} · {p.sizeMm} · {p.finish}
                  </span>
                </button>
                <span className="shrink-0 text-right text-sm">
                  <span className="block font-semibold text-ink tabular-nums">{formatInr(p.pricePerBox)}</span>
                  <span className="block text-xs text-muted">{p.sqftPerBox} sq ft</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.active}
                  aria-label={`${p.name} active`}
                  onClick={() => void toggle(p)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${p.active ? "bg-crm-accent" : "bg-crm-field"}`}
                >
                  <span aria-hidden className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${p.active ? "left-6" : "left-1"}`} />
                </button>
              </Row>
            ))}
          </AnimatePresence>
        </m.ul>
      )}

      <Dialog open={editing !== null} title={editing === "new" ? "Add product" : "Edit product"} onClose={() => setEditing(null)}>
        {editing ? (
          <ProductForm
            product={editing === "new" ? undefined : editing}
            onSaved={(p) => {
              replace(p);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Dialog>
    </Reveal>
  );
}

function ProductForm({ product, onSaved, onCancel }: { product?: Product; onSaved: (p: Product) => void; onCancel: () => void }) {
  const id = useId();
  const [f, setF] = useState({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    category: product?.category ?? ("floor" as Category),
    sizeMm: product?.sizeMm ?? "",
    finish: product?.finish ?? "",
    price: product ? String(product.pricePerBox / 100) : "",
    sqft: product ? String(product.sqftPerBox) : "",
    pieces: product ? String(product.piecesPerBox) : "",
    imageUrl: product?.imageUrl ?? "",
    active: product?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const suggested = sqftFromSize(f.sizeMm, Number(f.pieces));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");
    const body = {
      sku: f.sku,
      name: f.name,
      brand: f.brand,
      category: f.category,
      sizeMm: f.sizeMm,
      finish: f.finish,
      pricePerBox: Number(f.price),
      sqftPerBox: Number(f.sqft),
      piecesPerBox: Number(f.pieces),
      imageUrl: f.imageUrl.trim() || null,
      active: f.active,
    };
    try {
      const res = product
        ? await api<{ product: Product }>(`/api/crm/products/${product.id}`, { method: "PATCH", body })
        : await api<{ product: Product }>("/api/crm/products", { method: "POST", body });
      onSaved(res.product);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setFormError(err.message);
      } else setFormError("Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = (key: string, label: string, input: React.ReactNode) => (
    <div>
      <label htmlFor={`${id}-${key}`} className={ui.label}>
        {label}
      </label>
      {input}
      {errors[key] ? (
        <p id={`${id}-${key}-err`} className={ui.error}>
          {errors[key]}
        </p>
      ) : null}
    </div>
  );
  const inv = (key: string) => (errors[key] ? { "aria-invalid": true as const, "aria-describedby": `${id}-${key}-err` } : {});

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-2 gap-4">
      <div className="col-span-2">{field("name", "Name", <input id={`${id}-name`} value={f.name} onChange={set("name")} className={ui.input} {...inv("name")} />)}</div>
      {field("sku", "SKU", <input id={`${id}-sku`} value={f.sku} onChange={set("sku")} autoCapitalize="characters" className={ui.input} {...inv("sku")} />)}
      {field("brand", "Brand", <input id={`${id}-brand`} value={f.brand} onChange={set("brand")} className={ui.input} {...inv("brand")} />)}
      {field(
        "category",
        "Category",
        <select id={`${id}-category`} value={f.category} onChange={set("category")} className={ui.input}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>,
      )}
      {field("finish", "Finish", <input id={`${id}-finish`} value={f.finish} onChange={set("finish")} placeholder="Glossy" className={ui.input} {...inv("finish")} />)}
      {field("sizeMm", "Size, mm", <input id={`${id}-sizeMm`} value={f.sizeMm} onChange={set("sizeMm")} placeholder="600x600" className={ui.input} {...inv("sizeMm")} />)}
      {field("piecesPerBox", "Pieces per box", <input id={`${id}-piecesPerBox`} type="number" inputMode="numeric" value={f.pieces} onChange={set("pieces")} className={ui.input} {...inv("piecesPerBox")} />)}
      {field(
        "sqftPerBox",
        "Sq ft per box",
        <>
          <input id={`${id}-sqftPerBox`} type="number" inputMode="decimal" step="any" value={f.sqft} onChange={set("sqft")} className={ui.input} {...inv("sqftPerBox")} />
          {suggested && String(suggested) !== f.sqft ? (
            <button type="button" className="mt-1 text-xs font-semibold text-crm-accent underline underline-offset-2" onClick={() => setF((x) => ({ ...x, sqft: String(suggested) }))}>
              Use {suggested} from the size
            </button>
          ) : null}
        </>,
      )}
      {field("pricePerBox", "Price per box, ₹", <input id={`${id}-pricePerBox`} type="number" inputMode="decimal" step="any" value={f.price} onChange={set("price")} className={ui.input} {...inv("pricePerBox")} />)}
      <div className="col-span-2">
        {field("imageUrl", "Image link (optional)", <input id={`${id}-imageUrl`} type="url" value={f.imageUrl} onChange={set("imageUrl")} placeholder="https://" className={ui.input} {...inv("imageUrl")} />)}
      </div>
      <label className="col-span-2 flex items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" checked={f.active} onChange={(e) => setF((x) => ({ ...x, active: e.target.checked }))} className="size-5 accent-crm-accent" />
        Active (shows in the quote builder)
      </label>
      {formError && !Object.keys(errors).length ? (
        <p role="alert" className={`col-span-2 ${ui.error}`}>
          {formError}
        </p>
      ) : null}
      <div className="col-span-2 flex gap-3">
        <button type="submit" disabled={busy} className={`flex-1 ${ui.primary}`}>
          {busy ? "Saving…" : "Save product"}
        </button>
        <button type="button" onClick={onCancel} className={ui.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
