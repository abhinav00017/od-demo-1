import { z } from "zod";

/** Caps on what one chat request may carry. */
export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 800;
export const MAX_TOTAL_CHARS = 8000;

/**
 * The chat request. Strict: only `page` and `messages`. A body that adds `role`, `businessId`, `tools` or anything
 * else is refused, so nothing the browser sends can pick the business or the role (Lock 1).
 */
export const chatRequestSchema = z
  .strictObject({
    page: z.string().min(1).max(64),
    messages: z
      .array(
        z.strictObject({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
        }),
      )
      .min(1)
      .max(MAX_MESSAGES),
  })
  .refine((b) => b.messages.at(-1)?.role === "user", { message: "The last message must be the visitor's." })
  .refine((b) => b.messages.reduce((n, m) => n + m.content.length, 0) <= MAX_TOTAL_CHARS, { message: "The conversation is too long." });

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** The Confirm click: the signed token, plus the same first-touch attribution the booking form sends (display only). */
export const confirmRequestSchema = z.strictObject({
  token: z.string().min(10).max(4000),
  source: z.string().max(40).optional(),
  campaign: z.string().max(200).optional(),
  utm: z.record(z.string(), z.string().max(200)).optional(),
});
