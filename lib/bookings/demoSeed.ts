import { clinic } from "@/demos/lotus-clinic/data";
import { DEMO_PHONE_PREFIX } from "./demoPhones";
import type { BookingSource, BookingStatus, DemoBooking, DemoData, DemoMessage, Utm } from "./types";

/**
 * Sample data for the clinic dashboard, so the demo looks like a working clinic.
 * Deterministic: the same `today` and seed always give the same rows, ids included.
 * Every date is relative to `today` (YYYY-MM-DD, clinic time): about 32 bookings over the past 60 days,
 * 5 today and 8 over the next 7 days, for 14 made-up patients on made-up numbers (90000 2xxxx).
 * Exactly 3 bookings need action: one new today, one new later this week, one that wants a new time.
 */
export const DEMO_SEED = 20261110;

/** Made-up patients. Names are common in Visakhapatnam; none is a real person. */
const PATIENTS: { name: string; reason: string }[] = [
  { name: "Lakshmi Prasanna Varma", reason: "Pregnancy care" },
  { name: "Sravani Kondapalli", reason: "Pregnancy care" },
  { name: "Divya Teja Reddy", reason: "PCOS" },
  { name: "Harika Pydi", reason: "Fertility advice" },
  { name: "Anusha Gorle", reason: "Period problems" },
  { name: "Keerthana Bonam", reason: "Pregnancy care" },
  { name: "Mounika Dadi", reason: "PCOS" },
  { name: "Swathi Karri", reason: "Fertility advice" },
  { name: "Bhavana Lanka", reason: "Menopause" },
  { name: "Ramya Sri Peela", reason: "Routine check-up" },
  { name: "Jyothi Vasupalli", reason: "Period problems" },
  { name: "Nandini Ganta", reason: "Routine check-up" },
  { name: "Farheen Shaik", reason: "Pregnancy care" },
  { name: "Tejaswi Mylapilli", reason: "Something else" },
];

/** Bookings per patient, in the order above. Adds up to 45. Several repeat patients with 3 to 5 visits. */
const VISITS_PER_PATIENT = [5, 5, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2];

/** Sources by count, out of 45: about 40% website, 20% Google Ads, 12% Meta Ads, 10% Maps, 8% walk-in, 6% phone, 4% referral. */
const SOURCE_QUOTA: [BookingSource, number][] = [
  ["website", 18],
  ["google_ads", 9],
  ["meta_ads", 5],
  ["google_maps", 4],
  ["walk_in", 4],
  ["phone", 3],
  ["referral", 2],
];

const CAMPAIGN_BY_REASON: Record<string, string> = {
  "Pregnancy care": "pregnancy-care-vizag",
  PCOS: "pcos-awareness",
  "Fertility advice": "fertility-consult",
};
const CAMPAIGNS = ["pregnancy-care-vizag", "pcos-awareness", "fertility-consult"];

const NOTES = [
  { patient: 0, notes: "Second pregnancy, due in March. Prefers evening slots. Husband usually calls to confirm." },
  { patient: 2, notes: "On metformin since the last visit. Bring the ultrasound report next time." },
  { patient: 3, notes: "Speaks Telugu and Hindi. Follow-up after the HSG test." },
  { patient: 8, notes: "Allergic to penicillin." },
];

/** mulberry32: a small seeded PRNG. Returns numbers in [0, 1). */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = ReturnType<typeof prng>;
const pick = <T,>(rand: Rand, list: readonly T[]) => list[Math.floor(rand() * list.length)];
function shuffle<T>(rand: Rand, list: T[]) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** A v4-shaped uuid from the PRNG, so ids repeat with the seed. */
function uuid(rand: Rand) {
  const hex = Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16));
  hex[12] = "4";
  hex[16] = "89ab"[Math.floor(rand() * 4)];
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function parts(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
}

export function addDays(day: string, n: number) {
  const { y, m, d } = parts(day);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = Sunday. */
function weekday(day: string) {
  const { y, m, d } = parts(day);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** ISO timestamp for a clinic-time (India, UTC+5:30) day and time. */
function istIso(day: string, hour: number, minute: number) {
  const { y, m, d } = parts(day);
  return new Date(Date.UTC(y, m - 1, d, hour, minute) - 330 * 60 * 1000).toISOString();
}

/** The demo patient's number: 90000 2xxxx. */
export function demoPhone(index: number) {
  return `${DEMO_PHONE_PREFIX}${String(101 + index).padStart(4, "0")}`;
}

const [MORNING, AFTERNOON, EVENING] = clinic.booking.slots;

type Plan = { date: string; slot: string; status: BookingStatus; wantsNewTime?: boolean };

/** The day, slot and status of every booking, before patients are given out. */
function plan(rand: Rand, today: string): Plan[] {
  const out: Plan[] = [];
  // Past: 32 bookings over the last 60 days, no Sundays. Mostly visited, a few no-shows and cancellations.
  const pastStatuses = shuffle(rand, [...Array<BookingStatus>(24).fill("visited"), ...Array<BookingStatus>(4).fill("no_show"), ...Array<BookingStatus>(4).fill("cancelled")]);
  for (const status of pastStatuses) {
    let date = addDays(today, -1 - Math.floor(rand() * 60));
    if (weekday(date) === 0) date = addDays(date, -1);
    out.push({ date, slot: pick(rand, clinic.booking.slots), status });
  }
  // Today: two seen this morning, two confirmed for later, one new request.
  out.push(
    { date: today, slot: MORNING, status: "visited" },
    { date: today, slot: MORNING, status: "visited" },
    { date: today, slot: AFTERNOON, status: "confirmed" },
    { date: today, slot: EVENING, status: "confirmed" },
    { date: today, slot: EVENING, status: "new" },
  );
  // Next 7 days: confirmed, one new request, one confirmed patient who asked for a new time.
  const upcoming: Plan[] = [];
  const future: BookingStatus[] = ["confirmed", "confirmed", "confirmed", "confirmed", "confirmed", "confirmed", "new", "confirmed"];
  future.forEach((status, i) => {
    let date = addDays(today, 1 + Math.floor(rand() * 7));
    if (weekday(date) === 0) date = addDays(date, date === addDays(today, 7) ? -1 : 1);
    upcoming.push({ date, slot: pick(rand, clinic.booking.slots), status, wantsNewTime: i === future.length - 1 });
  });
  out.push(...upcoming);
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function utmFor(rand: Rand, source: BookingSource, campaign: string | null): Utm | null {
  switch (source) {
    case "google_ads":
      return { utm_source: "google", utm_medium: "cpc", utm_campaign: campaign ?? undefined, gclid: `demo-${Math.floor(rand() * 1e9).toString(36)}`, landing: "/clinic/website" };
    case "meta_ads":
      return {
        utm_source: pick(rand, ["facebook", "instagram"]),
        utm_medium: "paid_social",
        utm_campaign: campaign ?? undefined,
        fbclid: `demo-${Math.floor(rand() * 1e9).toString(36)}`,
        landing: "/clinic/website",
      };
    case "google_maps":
      return { referrer: "maps.google.com", landing: "/clinic/website/contact" };
    case "website":
      return { landing: pick(rand, ["/clinic/website", "/clinic/website/services", "/clinic/website/book"]) };
    default:
      return null;
  }
}

export function generateDemoData(today: string, seed: number = DEMO_SEED): DemoData {
  const rand = prng(seed);
  const slots = plan(rand, today);

  // Give out patients: each patient's bookings land on different days, in date order.
  const tokens = shuffle(
    rand,
    VISITS_PER_PATIENT.flatMap((n, p) => Array<number>(n).fill(p)),
  );
  const patientOf: number[] = Array<number>(slots.length).fill(0);
  const daysOf = new Map<number, Set<string>>();
  // Upcoming days first (fewest choices), then the past in a shuffled order, so no patient is left with clashing days.
  const order = [...slots.keys()].filter((i) => slots[i].date >= today).concat(shuffle(rand, [...slots.keys()].filter((i) => slots[i].date < today)));
  for (const i of order) {
    // Take the first token whose patient has nothing within 5 days of this one, then nothing on the same day, then any.
    const near = (p: number, gap: number) => [...(daysOf.get(p) ?? [])].some((d) => Math.abs(Date.parse(d) - Date.parse(slots[i].date)) < gap * 864e5);
    let k = tokens.findIndex((p) => !near(p, 5));
    if (k < 0) k = tokens.findIndex((p) => !near(p, 1));
    if (k < 0) k = 0;
    const [p] = tokens.splice(k, 1);
    patientOf[i] = p;
    daysOf.set(p, new Set([...(daysOf.get(p) ?? []), slots[i].date]));
  }

  // Sources by quota. Walk-ins only on past days (a walk-in is booked the day it happens).
  const sources = shuffle(
    rand,
    SOURCE_QUOTA.flatMap(([s, n]) => Array<BookingSource>(n).fill(s)),
  );
  for (let i = 0; i < slots.length; i++) {
    if (sources[i] !== "walk_in" || slots[i].date < today) continue;
    const j = sources.findIndex((s, k) => s !== "walk_in" && slots[k].date < today);
    if (j >= 0) [sources[i], sources[j]] = [sources[j], sources[i]];
  }

  const bookings: DemoBooking[] = slots.map((s, i) => {
    const p = patientOf[i];
    const patient = PATIENTS[p];
    const source = sources[i];
    const reason = rand() < 0.75 ? patient.reason : "Routine check-up";
    const campaign = source === "google_ads" || source === "meta_ads" ? (CAMPAIGN_BY_REASON[reason] ?? pick(rand, CAMPAIGNS)) : null;
    // Booked 1 to 6 days ahead, never later than yesterday. Walk-ins are booked the morning they come.
    const lead = source === "walk_in" ? 0 : 1 + Math.floor(rand() * 6);
    let createdDay = addDays(s.date, -lead);
    if (createdDay >= today && source !== "walk_in") createdDay = addDays(today, -1);
    const hour = source === "walk_in" ? 9 : 8 + Math.floor(rand() * 13);
    return {
      id: uuid(rand),
      createdAt: istIso(createdDay, hour, Math.floor(rand() * 60)),
      clinicSlug: "lotus-clinic",
      name: patient.name,
      phone: demoPhone(p),
      // Mostly clinic visits. Online on Sundays (the clinic is closed) and now and then otherwise.
      visitType: weekday(s.date) === 0 || rand() < 0.15 ? "online" : "clinic",
      date: s.date,
      slot: s.slot,
      reason,
      status: s.status,
      notes: null,
      wantsNewTime: s.wantsNewTime === true,
      source,
      campaign,
      utm: utmFor(rand, source, campaign),
    };
  });

  // WhatsApp confirmations on the confirmed and visited ones: delivered or read, a couple of hours after booking.
  const messages: DemoMessage[] = [];
  for (const b of bookings) {
    if (b.status !== "confirmed" && b.status !== "visited") continue;
    if (b.status === "visited" && rand() < 0.5) continue;
    const sent = new Date(Date.parse(b.createdAt) + (60 + Math.floor(rand() * 90)) * 60 * 1000).toISOString();
    const seen = new Date(Date.parse(sent) + Math.floor(rand() * 40 + 2) * 60 * 1000).toISOString();
    messages.push({
      bookingId: b.id,
      kind: "confirmation",
      provider: "fake",
      toMasked: `••••${b.phone.slice(-4)}`,
      template: "lotus_confirmation",
      status: rand() < 0.6 ? "read" : "delivered",
      createdAt: sent,
      updatedAt: seen,
    });
  }

  const notes = NOTES.map((n) => ({ phone: demoPhone(n.patient), notes: n.notes, updatedAt: istIso(addDays(today, -3), 18, 10) }));
  return { bookings, messages, notes };
}
