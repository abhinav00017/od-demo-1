import { clinic, clinicWhatsAppHref } from "@/demos/lotus-clinic/data";
import type { ToolName } from "./tools";

/**
 * A profile is everything Ogi knows about one business on one page: the facts it may answer from, the rules on top,
 * and which tools the page may use. Profiles are plain data, so a new business is a new entry here, not new code.
 * v1 has one profile: the Lotus clinic website. Its facts come straight from demos/lotus-clinic/data.ts, so the
 * website and Ogi never disagree.
 */
export type OgiProfile = {
  /** Server-side key. Never sent by the browser as a business id: the browser only names its page. */
  key: string;
  kind: "clinic";
  businessName: string;
  /** The Ogi image for this page (docs/ogi-image-guidelines.html, section 6). */
  mascot: string;
  greeting: string;
  /** Who to hand over to. The only phone number a reply may contain. */
  contact: { phone: string; whatsappHref: string; email: string };
  /** Facts Ogi may answer from, grouped by topic. Nothing else. */
  facts: Record<InfoTopic, unknown>;
  /** Rules on top of the facts. The code locks (lib/ogi) enforce the ones that can be checked. */
  rules: readonly string[];
  /** The tools this page may offer. A role's allow-list (tools.ts) still has to allow each one. */
  tools: readonly ToolName[];
  /** The emergency line for this business's country. */
  emergencyNumber: string;
};

export const INFO_TOPICS = ["hours", "address", "contact", "services", "doctor", "visit_types", "how_booking_works"] as const;
export type InfoTopic = (typeof INFO_TOPICS)[number];

const lotusClinic: OgiProfile = {
  key: "lotus-clinic",
  kind: "clinic",
  businessName: clinic.name,
  mascot: "/brand/ogi-clinic.svg",
  greeting: `Hi, I'm Ogi, the ${clinic.name} assistant. I can answer questions about the clinic, help you request a visit, or put you in touch with the team.`,
  contact: { phone: clinic.phone, whatsappHref: clinicWhatsAppHref, email: clinic.email },
  facts: {
    hours: clinic.hours,
    address: { lines: clinic.address, city: clinic.city },
    contact: { phone: clinic.phone, whatsapp: clinicWhatsAppHref, email: clinic.email },
    services: clinic.services.map((s) => ({ name: s.name, summary: s.short, includes: s.details, firstVisit: s.expect })),
    doctor: {
      name: clinic.doctor.name,
      degree: clinic.doctor.degree,
      role: clinic.doctor.role,
      yearsOfExperience: clinic.doctor.years,
      languages: clinic.doctor.languages,
      about: clinic.doctor.intro,
    },
    visit_types: clinic.booking.visitTypes,
    how_booking_works: {
      steps: clinic.journey.map((j) => `${j.title}: ${j.text}`),
      timeWindows: clinic.booking.slots,
      reasons: clinic.booking.reasons,
      sunday: "The clinic is closed on Sundays for clinic visits. Online consultations are available on Sundays.",
    },
  },
  rules: [
    "No medical advice. Do not read symptoms, suggest a diagnosis, a medicine or a dose. Offer a visit instead.",
    `Emergencies: tell the person to call 108 or go to the nearest emergency room now, and also give the clinic phone ${clinic.phone}.`,
    "Only talk about this clinic. Politely decline anything else, including other businesses.",
    "Never invent a price, a time, a doctor or a promise. If a fact is not in the profile, hand over to staff.",
  ],
  tools: ["clinic_info", "request_visit", "hand_over"],
  emergencyNumber: "108",
};

/**
 * The page allow-list: the only values of `page` the API accepts, each mapped to its profile on the server.
 * Anything else is a 400. The browser can name a page; it can never name a business, a role or a tool.
 */
const OGI_PAGES: Readonly<Record<string, OgiProfile>> = Object.freeze({
  "lotus-clinic": lotusClinic,
});

export const OGI_PAGE_KEYS = Object.keys(OGI_PAGES);

/** The profile for a page, or undefined. Own keys only, so "__proto__" or "constructor" never match. */
export function profileForPage(page: string): OgiProfile | undefined {
  return Object.hasOwn(OGI_PAGES, page) ? OGI_PAGES[page] : undefined;
}
