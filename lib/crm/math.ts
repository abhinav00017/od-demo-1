/**
 * Quote maths, shared by the quote builder in the browser and the API, so both always agree.
 * No Node imports here: this file ships to the browser.
 */

/** Rounds away float noise (110.00000000000001) before a ceil turns it into one box too many. */
function clean(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

/** Sq ft to cover, with wastage: 120 sq ft at 10% is 132 sq ft. */
export function areaWithWastage(areaSqft: number, wastagePct: number) {
  return clean(areaSqft * (1 + wastagePct / 100));
}

/** Boxes for a room: area plus wastage, divided by sq ft per box, rounded up. At least one box. */
export function boxesForArea(areaSqft: number, wastagePct: number, sqftPerBox: number) {
  if (!(areaSqft > 0) || !(sqftPerBox > 0)) return 0;
  return Math.max(1, Math.ceil(clean(areaWithWastage(areaSqft, wastagePct) / sqftPerBox)));
}

/** Sq ft that a number of boxes covers. */
export function coverage(qtyBoxes: number, sqftPerBox: number) {
  return Math.round(qtyBoxes * sqftPerBox * 100) / 100;
}

export type LineInput = { qtyBoxes?: number; areaSqft?: number | null; wastagePct?: number };

/** Boxes for one line: from the area when one is given, else the boxes typed. */
export function lineBoxes(line: LineInput, sqftPerBox: number) {
  if (line.areaSqft != null && line.areaSqft > 0) return boxesForArea(line.areaSqft, line.wastagePct ?? 10, sqftPerBox);
  return Math.max(0, Math.floor(line.qtyBoxes ?? 0));
}

export function quoteTotals(lineTotals: number[], discount: number) {
  const subtotal = lineTotals.reduce((sum, n) => sum + n, 0);
  const off = Math.min(Math.max(0, Math.round(discount)), subtotal);
  return { subtotal, discount: off, total: subtotal - off };
}

/** ₹ typed by staff -> paise. 1245.5 -> 124550. */
export function rupeesToPaise(rupees: number) {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number) {
  return paise / 100;
}

const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0, minimumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** 12345600 -> "₹1,23,456". Paise show only when there are some: 124550 -> "₹1,245.50". */
export function formatInr(paise: number) {
  return paise % 100 === 0 ? inr0.format(paise / 100) : inr2.format(paise / 100);
}

/** ("KT", 7) -> "KT-0007". */
export function quoteNumber(prefix: string, seq: number) {
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

/** How long a quote holds its prices. */
export const QUOTE_VALID_DAYS = 7;

/** The last day a quote is valid, counted from when it was sent (or made, for a draft). */
export function validUntil(quote: { sentAt: string | null; createdAt: string }) {
  const from = new Date(quote.sentAt ?? quote.createdAt).getTime();
  return new Date(from + QUOTE_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** "98765 43210". */
export function formatPhone(phone: string) {
  return phone.length === 10 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

/** "Priya Sharma" -> "Priya". */
export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}
