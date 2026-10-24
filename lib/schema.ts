import { z } from "zod";
import { LIVE_DEMOS } from "./demos";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lower-case words joined by hyphens");
const line = z.string().min(1).max(160);

const chatMessage = z.object({
  from: z.enum(["business", "customer"]),
  text: z.string().min(1),
  time: z.string().min(1),
  /** Small label above the message, such as "Day before". */
  label: z.string().optional(),
  /** Quick-reply buttons under a business message. */
  buttons: z.array(z.string()).max(3).optional(),
});

/** The mocked UI frame on a preview page. Each kind has its own component in components/mocks. */
export const mockSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("chat"),
    contact: z.string(),
    status: z.string(),
    messages: z.array(chatMessage).min(2),
  }),
  z.object({
    kind: z.literal("maps"),
    name: z.string(),
    category: z.string(),
    rating: z.number().min(1).max(5),
    reviews: z.number().int().positive(),
    area: z.string(),
    openLine: z.string(),
    closesLine: z.string(),
    review: z.object({ author: z.string(), text: z.string(), when: z.string() }),
    photos: z.array(z.enum(["teal", "sand", "rose", "espresso", "crema", "clay"])).length(3),
  }),
  z.object({
    kind: z.literal("video"),
    doctor: z.string(),
    patient: z.string(),
    fee: z.string(),
    day: z.string(),
    slots: z.array(z.object({ time: z.string(), taken: z.boolean().optional() })).min(4),
    chosen: z.string(),
  }),
  z.object({
    kind: z.literal("offers"),
    heading: z.string(),
    items: z.array(z.object({ title: z.string(), price: z.string(), note: z.string(), tag: z.string().optional() })).min(2).max(4),
  }),
  z.object({
    kind: z.literal("records"),
    patient: z.string(),
    meta: z.string(),
    visits: z
      .array(z.object({ date: z.string(), title: z.string(), files: z.array(z.string()).min(1) }))
      .min(2)
      .max(4),
  }),
  z.object({
    kind: z.literal("browser"),
    url: z.string(),
    name: z.string(),
    headline: z.string(),
    sub: z.string(),
    cta: z.string(),
    items: z.array(z.object({ name: z.string(), price: z.string() })).min(3).max(4),
  }),
  z.object({
    kind: z.literal("qr-menu"),
    name: z.string(),
    table: z.string(),
    sections: z
      .array(z.object({ title: z.string(), items: z.array(z.object({ name: z.string(), price: z.string(), note: z.string().optional() })).min(1) }))
      .min(2),
  }),
  z.object({
    kind: z.literal("loyalty"),
    name: z.string(),
    customer: z.string(),
    stamps: z.number().int().min(0),
    goal: z.number().int().min(2).max(12),
    reward: z.string(),
    offers: z.array(z.object({ title: z.string(), when: z.string() })).min(1).max(3),
  }),
  z.object({
    kind: z.literal("summary"),
    name: z.string(),
    date: z.string(),
    total: z.string(),
    change: z.string(),
    orders: z.number().int(),
    average: z.string(),
    hours: z.array(z.object({ label: z.string(), value: z.number().min(0) })).min(4),
    top: z.array(z.object({ name: z.string(), count: z.number().int() })).min(2).max(4),
  }),
  z.object({
    kind: z.literal("leads"),
    name: z.string(),
    period: z.string(),
    stats: z.array(z.object({ label: z.string(), value: z.string() })).min(2).max(3),
    leads: z
      .array(
        z.object({
          name: z.string(),
          source: z.string(),
          interest: z.string(),
          status: z.enum(["new", "follow-up", "visit-booked", "brochure-opened"]),
          when: z.string(),
        }),
      )
      .min(3)
      .max(6),
  }),
]);

const step = z.object({ title: z.string().min(1).max(60), text: line });

const preview = z.object({
  intro: line,
  gets: z.array(line).min(3).max(5),
  steps: z.array(step).length(3),
  mock: mockSchema,
});

const demoId = z.enum(Object.keys(LIVE_DEMOS) as [keyof typeof LIVE_DEMOS, ...(keyof typeof LIVE_DEMOS)[]]);

export const serviceSchema = z.discriminatedUnion("status", [
  z.object({ slug, name: z.string().min(1), summary: line, status: z.literal("live"), demo: demoId }),
  z.object({ slug, name: z.string().min(1), summary: line, status: z.literal("preview"), preview }),
]);

export const industrySchema = z.object({
  slug,
  name: z.string().min(1),
  /** Lower-case plural for headings, such as "clinics". */
  plural: z.string().min(1),
  /** Short line on the landing card. */
  audience: line,
  /** One line on the industry page: what onlydevs does for this industry. */
  pitch: line,
  icon: z.enum(["clinic", "cafe", "real-estate"]),
  services: z.array(serviceSchema).min(1),
});

export const catalogSchema = z
  .array(industrySchema)
  .min(1)
  .superRefine((industries, ctx) => {
    const seen = new Set<string>();
    industries.forEach((industry, i) => {
      if (seen.has(industry.slug)) ctx.addIssue({ code: "custom", path: [i, "slug"], message: `duplicate industry "${industry.slug}"` });
      seen.add(industry.slug);
      const services = new Set<string>();
      industry.services.forEach((s, j) => {
        if (services.has(s.slug))
          ctx.addIssue({ code: "custom", path: [i, "services", j, "slug"], message: `duplicate service "${s.slug}"` });
        services.add(s.slug);
      });
    });
  });

export type Mock = z.infer<typeof mockSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type PreviewService = Extract<Service, { status: "preview" }>;
export type Industry = z.infer<typeof industrySchema>;
