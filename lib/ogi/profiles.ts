import { clinic, clinicWhatsAppHref } from "@/demos/lotus-clinic/data";
import { cafe, MENU_ITEMS, PARTY_SIZES, RESERVATION_TIMES, WHATSAPP_DISPLAY, whatsAppHref } from "@/demos/solstice-cafe/data";
import { EVENT_TYPES, fromPrice, MAX_DAYS_AHEAD, minimumLine, rupees, VENUES, venueHref } from "@/demos/solstice-cafe/events";
import { CAFE_AUTH, type AuthArea } from "@/lib/admin/auth";
import { orgForSlug, type OrgId } from "@/lib/orgs";
import type { ToolName } from "./tools";

/**
 * A profile is everything Ogi knows about one business on one page: the facts it may answer from, the rules on top,
 * and which tools the page may use. Profiles are plain data, so a new business is a new entry here, not new code.
 * Two profiles: the Lotus clinic website and the Solstice cafe website. Their facts come straight from each demo's
 * data files, so the website and Ogi never disagree.
 */
export type OgiProfile = {
  /** Server-side key: the page's slug. The browser only names its page, never an organization. */
  key: string;
  /** The organization this page belongs to, found on the server from the page's slug. Every database read uses it. */
  orgId: OrgId;
  kind: "clinic" | "cafe";
  businessName: string;
  /** The Ogi image for this page (docs/ogi-image-guidelines.html, section 6). */
  mascot: string;
  greeting: string;
  /** Who to hand over to. The only phone number a reply may contain. */
  contact: { phone: string; whatsappHref: string; email?: string };
  /** Facts Ogi may answer from, grouped by topic. Nothing else. */
  facts: Readonly<Record<string, unknown>>;
  /** Rules on top of the facts. The code locks (lib/ogi) enforce the ones that can be checked. */
  rules: readonly string[];
  /** The tools this page may offer. A role's allow-list (tools.ts) still has to allow each one. */
  tools: readonly ToolName[];
  /** The emergency line for this business's country. */
  emergencyNumber: string;
  /** How to collect a request and which tool prepares it. Goes into the instructions. */
  requestHowTo: string;
  /** Said when a Confirm summary is ready but the model wrote no text. */
  confirmPrompt: string;
  /**
   * Owner pages only: the login area the chat route checks on the server for every request. A page with this set
   * answers 401 without that area's valid cookie, and with it runs as the owner role. Pages without it are visitor pages.
   */
  ownerArea?: AuthArea;
  /** The first line of the instructions. Defaults to the visitor assistant line. */
  intro?: string;
  /** Owner pages: every number in a reply must appear in the facts, this turn's tool results, today's date or the question. */
  strictNumbers?: boolean;
  /** What a blocked or failed reply says instead of the visitor hand-over. */
  fallback?: string;
  /** Example questions the bubble shows as chips. */
  examples?: readonly string[];
};

export const INFO_TOPICS = ["hours", "address", "contact", "services", "doctor", "visit_types", "how_booking_works"] as const;
export type InfoTopic = (typeof INFO_TOPICS)[number];

export const CAFE_INFO_TOPICS = ["hours", "address", "contact", "menu", "ordering", "table_reservations", "events", "how_event_enquiries_work"] as const;
export type CafeInfoTopic = (typeof CAFE_INFO_TOPICS)[number];

/** The organization for a page's slug, from the server's list. A page with no organization is a startup error. */
function orgOfPage(slug: string): OrgId {
  const org = orgForSlug(slug);
  if (!org) throw new Error(`Ogi page ${slug} has no organization in lib/orgs.ts`);
  return org.id;
}

const lotusClinic: OgiProfile = {
  key: "lotus-clinic",
  orgId: orgOfPage("lotus-clinic"),
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
  requestHowTo:
    "To request a visit, collect: full name, 10-digit mobile number, clinic visit or online consultation, preferred day, time window and reason. " +
    "Then call request_visit. Never say a visit is booked or confirmed: the visitor must press Confirm on the summary.",
  confirmPrompt: "Here's your visit request. Please check it and press Confirm to send it to the clinic.",
};

/**
 * The Solstice cafe (25 Nov 2026): one profile for the home page, the events page and both venue pages. Facts come
 * from demos/solstice-cafe/data.ts and events.ts. Prices are written with ₹ so the reply check knows them: any other
 * amount in a reply (a total, a discount, a "final" price) is blocked.
 */
const solsticeCafe: OgiProfile = {
  key: "solstice-cafe",
  orgId: orgOfPage("solstice-cafe"),
  kind: "cafe",
  businessName: cafe.name,
  mascot: "/brand/ogi-cafe.svg",
  greeting: `Hi, I'm Ogi, the Solstice assistant. I can answer questions about the cafe, the menu and our two event spaces, or help you send an event enquiry.`,
  contact: { phone: WHATSAPP_DISPLAY, whatsappHref: whatsAppHref() },
  facts: {
    hours: cafe.hours,
    address: { address: cafe.address, parking: "Complimentary valet parking and EV charging bays." },
    contact: { whatsapp: WHATSAPP_DISPLAY, whatsappLink: whatsAppHref() },
    menu: MENU_ITEMS.map((i) => ({ name: i.name, category: i.category, price: rupees(i.price), about: i.description, note: i.dietaryNote })),
    ordering:
      "Tap Order on WhatsApp on the website, add items, and choose courtyard pickup or Jubilee Hills delivery. " +
      "The order is typed into a WhatsApp message; the cafe confirms it on WhatsApp.",
    table_reservations: {
      how: "Use the Reserve form on the home page. The request opens in WhatsApp and the team confirms the table there. No deposit.",
      times: RESERVATION_TIMES.map((t) => t.label),
      partySizes: PARTY_SIZES.map((p) => p.label),
    },
    events: VENUES.map((v) => ({
      venue: v.name,
      id: v.id,
      kind: v.kind,
      about: v.intro,
      guests: `${v.minGuests} to ${v.maxGuests} guests`,
      price: fromPrice(v),
      minimum: minimumLine(v),
      length: "3 hours",
      slots: v.slots.map((s) => ({ id: s.id, label: s.label, time: s.time })),
      included: v.included,
      goodFor: v.goodFor,
      notes: v.notes,
      page: venueHref(v),
    })),
    how_event_enquiries_work: {
      steps: [
        "Pick a venue, a date, a time slot, the number of guests and the type of event.",
        "Send an enquiry on the venue page, or here with Ogi.",
        "The cafe calls you to talk it through and confirm the final quote. Nothing is booked or charged until then.",
      ],
      eventTypes: EVENT_TYPES.map((t) => ({ id: t.id, label: t.label })),
      dates: `Today up to ${MAX_DAYS_AHEAD} days ahead.`,
    },
  },
  rules: [
    "Only talk about this cafe. Politely decline anything else, including other businesses.",
    "Prices: only give the menu prices and the 'from' prices in the facts. Never work out a total, a final price, a discount or a deposit. The cafe confirms the final quote on a call.",
    "Never say an event or a table is booked, confirmed or available on a date. Only the cafe can confirm that.",
    "Allergies and special diets: do not promise anything is safe. Hand over to the team.",
    "Never invent a fact. If it is not in the facts, say you don't know and hand over to staff.",
  ],
  tools: ["cafe_info", "request_event_enquiry", "hand_over"],
  emergencyNumber: "112",
  requestHowTo:
    "To send an event enquiry, collect: the venue (The Courtyard or The Conservatory), the type of event, the date, the time slot, the number of guests, " +
    "the visitor's full name and 10-digit mobile number, and any notes. Then call request_event_enquiry. " +
    "Never say the event is booked or confirmed: the visitor must press Confirm on the summary, and then the cafe calls to confirm the final quote.",
  confirmPrompt: "Here's your event enquiry. Please check it and press Confirm to send it to the cafe.",
};

/**
 * Owner Ogi on the Solstice owner page (/cafe/website/events/admin), 25 Nov 2026. Read-only: its tools only count and
 * list the cafe's own enquiries and orders (lib/ogi/cafeOwner.ts). The chat route runs it only for a valid cafe_session
 * cookie (ownerArea), checked on the server for every request. Same organization as the visitor profile.
 */
const solsticeCafeOwner: OgiProfile = {
  ...solsticeCafe,
  key: "solstice-cafe-owner",
  mascot: "/brand/ogi-owner.svg",
  greeting: "Hi, I'm Ogi. Ask me about your enquiries, orders and sales.",
  facts: {
    hours: solsticeCafe.facts.hours,
    address: solsticeCafe.facts.address,
    menu: solsticeCafe.facts.menu,
    events: solsticeCafe.facts.events,
    data: "Enquiries come from the venue pages and Ogi. Orders are website tray orders plus WhatsApp and walk-in orders recorded here. The data includes sample (demo) rows.",
  },
  rules: [
    "You are talking to the cafe owner, who is logged in. Answer about this cafe's own data only.",
    "For any question about counts, leads, enquiries, orders, sales, items or dates, call a tool first, every time, even if an earlier answer had the number.",
    "Every number you say must come from a tool result in this turn. Do not add, subtract, average or estimate numbers yourself. If you need another total, call the tool again with a different period or grouping.",
    "Pick the period carefully: 'this month' = this_month, 'last week' = last_week, 'next week' = next_week, 'recently' = last_30_days. For events happening on a date use dateBasis event_date; for leads received use received.",
    "You can only read. You cannot change, confirm, cancel or delete anything. If asked, say the owner can change an enquiry's status in the list on this page.",
    "There is no data on profit, costs, margins, staff, wages, stock, rent, reviews or footfall. For those say: I don't have that data.",
    "Say which period you mean in the answer, e.g. 'In the last 7 days'.",
  ],
  tools: ["enquiry_stats", "list_enquiries", "order_stats", "top_items"],
  requestHowTo: "Keep answers to one to three short sentences with the key numbers. Use plain text, no lists.",
  confirmPrompt: "Ask me about your enquiries, orders and sales.",
  ownerArea: CAFE_AUTH,
  intro: `You are Ogi, the owner's assistant for ${cafe.name}. You speak only to the cafe owner, about this cafe.`,
  strictNumbers: true,
  fallback: "Sorry, I couldn't answer that from your data. Try asking another way, for example: how many orders in the last 7 days?",
  examples: [
    "How many enquiries this month?",
    "What is the best-selling item?",
    "What were sales last week?",
    "Which venue gets more enquiries?",
  ],
};

/**
 * The page allow-list: the only values of `page` the API accepts, each mapped to its profile on the server.
 * Anything else is a 400. The browser can name a page; it can never name a business, a role or a tool.
 */
const OGI_PAGES: Readonly<Record<string, OgiProfile>> = Object.freeze({
  "lotus-clinic": lotusClinic,
  "solstice-cafe": solsticeCafe,
  "solstice-cafe-owner": solsticeCafeOwner,
});

export const OGI_PAGE_KEYS = Object.keys(OGI_PAGES);

/** The profile for a page, or undefined. Own keys only, so "__proto__" or "constructor" never match. */
export function profileForPage(page: string): OgiProfile | undefined {
  return Object.hasOwn(OGI_PAGES, page) ? OGI_PAGES[page] : undefined;
}
