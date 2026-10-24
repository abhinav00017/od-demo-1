import type { NextRequest } from "next/server";
import { crm, json, notFound, parseBody } from "@/lib/crm/http";
import { rupeesToPaise } from "@/lib/crm/math";
import { DuplicateError, isUuid } from "@/lib/crm/types";
import { productPatchBody } from "@/lib/crm/validation";

/** Edit a product or switch it on and off. Quotes keep the price they were saved with. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/crm/products/[id]">) {
  const { id } = await ctx.params;
  return crm(req, "product update", async ({ store, shop }) => {
    if (!isUuid(id)) return notFound("product");
    const body = await parseBody(req, productPatchBody);
    if (!body.ok) return body.res;
    const { pricePerBox, ...rest } = body.data;
    try {
      const product = await store.updateProduct(shop.slug, id, { ...rest, ...(pricePerBox !== undefined ? { pricePerBox: rupeesToPaise(pricePerBox) } : {}) });
      return product ? json({ ok: true, product }) : notFound("product");
    } catch (err) {
      if (err instanceof DuplicateError) return json({ ok: false, error: "That SKU is already in the catalogue.", fieldErrors: { sku: "Already in the catalogue." } }, 409);
      throw err;
    }
  });
}
