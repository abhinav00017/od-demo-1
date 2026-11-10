import { z } from "zod";
import { PUBLIC_SOURCES, UTM_KEYS, type PublicSource, type Utm } from "./sources";

const MAX_LEN = 200;
const MAX_CAMPAIGN = 100;

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.trim().slice(0, max))
    .optional()
    .catch(undefined);

const utmSchema = z.object(Object.fromEntries(UTM_KEYS.map((k) => [k, text(MAX_LEN)])) as Record<keyof Utm, ReturnType<typeof text>>);

const attributionSchema = z.object({
  source: z.enum(PUBLIC_SOURCES).catch("website"),
  campaign: text(MAX_CAMPAIGN),
  utm: utmSchema.nullable().optional().catch(null),
});

/**
 * Re-checks the attribution the booking form sends. Untrusted and display only: an unknown source becomes
 * "website", strings are trimmed and capped, unknown keys are dropped, and a broken value never fails the booking.
 */
export function parseAttribution(body: unknown): { source: PublicSource; campaign: string | null; utm: Utm | null } {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const parsed = attributionSchema.safeParse({ source: raw.source, campaign: raw.campaign, utm: raw.utm });
  if (!parsed.success) return { source: "website", campaign: null, utm: null };
  const utm = parsed.data.utm ? (Object.fromEntries(Object.entries(parsed.data.utm).filter(([, v]) => typeof v === "string" && v !== "")) as Utm) : null;
  return {
    source: parsed.data.source,
    campaign: parsed.data.campaign || null,
    utm: utm && Object.keys(utm).length ? utm : null,
  };
}
