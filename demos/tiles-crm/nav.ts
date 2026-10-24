/**
 * Where the CRM is: one page, /tiles/crm, with the screen in the query string (?v=lead&id=...).
 * Moving uses history.pushState, which Next.js syncs into useSearchParams, so the page itself stays static
 * and Back works like any site.
 */
export type View =
  | { v: "today" }
  | { v: "leads" }
  | { v: "customers" }
  | { v: "products" }
  | { v: "lead"; id: string }
  | { v: "quote"; id?: string; lead?: string };

export function readView(params: Pick<URLSearchParams, "get">): View {
  const v = params.get("v");
  const id = params.get("id") ?? undefined;
  switch (v) {
    case "leads":
    case "customers":
    case "products":
      return { v };
    case "lead":
      return id ? { v, id } : { v: "leads" };
    case "quote":
      return id || params.get("lead") ? { v, id, lead: params.get("lead") ?? undefined } : { v: "leads" };
    default:
      return { v: "today" };
  }
}

export function viewQuery(view: View) {
  const q = new URLSearchParams();
  if (view.v !== "today") q.set("v", view.v);
  if ("id" in view && view.id) q.set("id", view.id);
  if (view.v === "quote" && view.lead && !view.id) q.set("lead", view.lead);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function go(view: View, { replace = false } = {}) {
  const url = `${window.location.pathname}${viewQuery(view)}`;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  window.scrollTo({ top: 0 });
}
