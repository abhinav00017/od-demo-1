import type { NextRequest } from "next/server";
import { crm, json, parseBody } from "@/lib/crm/http";
import { rupeesToPaise } from "@/lib/crm/math";
import { DuplicateError } from "@/lib/crm/types";
import { productCreateBody } from "@/lib/crm/validation";

/** The whole catalogue, active and not. The screens search it in the browser. */
export async function GET(req: NextRequest) {
  return crm(req, "products list", async ({ store, shop }) => json({ ok: true, products: await store.listProducts(shop.slug) }));
}

export async function POST(req: NextRequest) {
  return crm(req, "product create", async ({ store, shop }) => {
    const body = await parseBody(req, productCreateBody);
    if (!body.ok) return body.res;
    try {
      const product = await store.createProduct(shop.slug, { ...body.data, pricePerBox: rupeesToPaise(body.data.pricePerBox) });
      return json({ ok: true, product }, 201);
    } catch (err) {
      if (err instanceof DuplicateError) return json({ ok: false, error: "That SKU is already in the catalogue.", fieldErrors: { sku: "Already in the catalogue." } }, 409);
      throw err;
    }
  });
}
