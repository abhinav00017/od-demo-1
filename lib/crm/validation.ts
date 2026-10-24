/** Zod schemas for every CRM request body. Money arrives in rupees and the API turns it into paise. */
import { z } from "zod";
import { normalisePhone } from "@/demos/lotus-clinic/booking";
import { CATEGORIES, LEAD_SOURCES } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = z.string().regex(UUID, "Not a valid id.");
const text = (max: number) => z.string().trim().max(max);

/** A 10-digit Indian mobile, typed any common way (+91, spaces, a leading 0). Comes out as 10 digits. */
export const phone = z
  .string()
  .transform((v, ctx) => {
    const digits = normalisePhone(v);
    if (!digits) {
      ctx.addIssue({ code: "custom", message: "Enter a 10-digit mobile number, like 98765 43210." });
      return z.NEVER;
    }
    return digits;
  });

export const loginBody = z.object({ password: z.string().min(1).max(200) });

export const leadCreateBody = z.object({
  name: text(80).min(2, "Enter the customer's name."),
  phone,
  source: z.enum(LEAD_SOURCES),
  notes: text(1000).default(""),
});

export const leadPatchBody = z
  .object({
    name: text(80).min(2, "Enter the customer's name.").optional(),
    source: z.enum(LEAD_SOURCES).optional(),
    notes: text(1000).optional(),
    // Customer only comes from a sold quote. Staff can mark a lead lost, or bring it back.
    status: z.enum(["lead", "lost"]).optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Nothing to change.");

const rupees = (max: number) => z.number().finite().min(0).max(max);

const productFields = {
  sku: text(40).min(1, "Enter a SKU.").regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes."),
  name: text(80).min(2, "Enter a name."),
  brand: text(60).min(1, "Enter a brand."),
  category: z.enum(CATEGORIES),
  sizeMm: z
    .string()
    .trim()
    .transform((v) => v.toLowerCase().replace(/\s*[x×*]\s*/, "x"))
    .pipe(z.string().regex(/^\d{2,4}x\d{2,4}$/, "Size like 600x600.")),
  finish: text(40).min(1, "Enter a finish."),
  pricePerBox: rupees(1_000_000).refine((v) => v > 0, "Enter the price per box."),
  sqftPerBox: z.number().finite().gt(0, "Enter sq ft per box.").max(500),
  piecesPerBox: z.number().int().min(1).max(1000),
  imageUrl: z
    .union([z.literal(""), z.url({ protocol: /^https?$/ }).max(500)])
    .nullable()
    .transform((v) => v || null),
  active: z.boolean(),
};

export const productCreateBody = z.object({ ...productFields, active: productFields.active.default(true), imageUrl: productFields.imageUrl.default(null) });
export const productPatchBody = z
  .object(productFields)
  .partial()
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Nothing to change.");

const line = z
  .object({
    productId: id,
    qtyBoxes: z.number().int().min(0).max(100_000).optional(),
    areaSqft: z.number().finite().min(0).max(1_000_000).nullable().optional(),
    wastagePct: z.number().finite().min(0).max(50).optional(),
  })
  .refine((l) => (l.areaSqft ?? 0) > 0 || (l.qtyBoxes ?? 0) > 0, "Enter boxes or an area for every line.");

const quoteFields = {
  items: z.array(line).min(1, "Add at least one product.").max(60),
  discount: rupees(10_000_000).default(0),
  notes: text(1000).default(""),
};

export const quoteCreateBody = z.object({ leadId: id, ...quoteFields });
export const quoteSaveBody = z.object(quoteFields);
export const quoteStatusBody = z.object({ status: z.enum(["sold", "lost"]) });
export const followupActionBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("done"), result: text(200).optional() }),
  z.object({ action: z.literal("snooze"), days: z.number().int().min(1).max(30).default(2) }),
]);
export const followupCreateBody = z.object({ inDays: z.number().int().min(0).max(60), quoteId: id.optional() });

/** The first problem per field, for forms. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "form";
    out[key] ??= issue.message;
  }
  return out;
}

export { id as idSchema };
