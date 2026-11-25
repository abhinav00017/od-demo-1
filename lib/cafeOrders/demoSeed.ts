import { MENU_ITEMS } from "@/demos/solstice-cafe/data";
import { DEMO_PHONE_PREFIX } from "@/lib/bookings/demoPhones";
import type { PublicSource } from "@/lib/bookings/sources";
import { addDays } from "@/lib/cafeEvents/validation";
import type { DemoOrder, Fulfilment, OrderChannel, OrderItem } from "./types";

/**
 * Sample orders for the cafe owner, so owner Ogi and the Orders summary have a working cafe to talk about.
 * Deterministic: each calendar day's orders come from a random generator seeded by that day, so the same day always
 * gets the same orders. 60 days back from `today` (India), today only up to `now`.
 * The shape is meant to look real: weekends busier than weekdays (Sunday most), a morning chai and coffee rush, pizzas
 * at lunch and in the evening, Charminar Saffron Irani Chai (niloufer-heritage-chai) the clear best seller, and three slow items
 * (the Sulaimani tea, the cold brew tonic, the karampodi pizza). Channels mixed: walk-in, WhatsApp, website.
 * Names are made up. Phones are in the demo block 90000 26000 to 26999 (lib/bookings/demoPhones.ts).
 */

export const DEMO_ORDER_DAYS = 60;

/** Relative weights per menu id, by part of the day. */
const WEIGHTS: Record<"morning" | "lunch" | "evening", Record<string, number>> = {
  morning: {
    "niloufer-heritage-chai": 30, "zafrani-malai-chai": 12, "sulaimani-hibiscus-chai": 2, "araku-pour-over": 14, "chikmagalur-cortado": 10,
    "gondhoraj-espresso-tonic": 2, "osmania-salted-croissant": 18, "pistachio-cardamom-cruffin": 8, "dark-choc-sea-salt-pain": 7,
  },
  lunch: {
    "tellicherry-burrata-pizza": 11, "gongura-pesto-pizza": 9, "karampodi-mushroom-pizza": 2, "niloufer-heritage-chai": 12, "zafrani-malai-chai": 5,
    "sulaimani-hibiscus-chai": 2, "araku-pour-over": 5, "chikmagalur-cortado": 5, "gondhoraj-espresso-tonic": 3, "osmania-salted-croissant": 4,
    "pistachio-cardamom-cruffin": 3, "dark-choc-sea-salt-pain": 3,
  },
  evening: {
    "niloufer-heritage-chai": 18, "zafrani-malai-chai": 9, "sulaimani-hibiscus-chai": 2, "araku-pour-over": 4, "chikmagalur-cortado": 5,
    "gondhoraj-espresso-tonic": 2, "tellicherry-burrata-pizza": 12, "gongura-pesto-pizza": 10, "karampodi-mushroom-pizza": 2,
    "osmania-salted-croissant": 4, "pistachio-cardamom-cruffin": 5, "dark-choc-sea-salt-pain": 6,
  },
};

const NAMES = [
  "Rohan Mehta", "Ananya Reddy", "Kiran Kumar", "Priya Nair", "Sameer Ali", "Deepika Rao", "Varun Goud", "Swathi Iyer", "Naveen Chowdary",
  "Farah Begum", "Arvind Shetty", "Keerthi Varma", "Manish Agarwal", "Tanvi Kulkarni", "Yusuf Pasha", "Bhavana Reddy", "Chaitanya Raju",
  "Lakshmi Prasad", "Omar Siddiqui", "Ritika Jain", "Suresh Babu", "Harini Krishnan", "Abhishek Sinha", "Nandini Rao",
];

const SOURCES: [PublicSource, number][] = [["website", 35], ["google_search", 20], ["google_maps", 20], ["meta_ads", 15], ["google_ads", 10]];

/** mulberry32: a tiny seeded random generator. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pick<T>(r: () => number, options: readonly [T, number][]): T {
  const total = options.reduce((n, [, w]) => n + w, 0);
  let x = r() * total;
  for (const [v, w] of options) if ((x -= w) < 0) return v;
  return options[options.length - 1][0];
}

const IST_MS = (5 * 60 + 30) * 60 * 1000;

/** A moment on a YYYY-MM-DD India day, `minutes` after midnight India time, in ms. */
function atIndia(day: string, minutes: number) {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - IST_MS + minutes * 60_000;
}

/** Orders on one day: Sunday most, then Saturday, Friday, then weekdays, with a gentle rise over the 60 days. */
function ordersOn(day: string, daysAgo: number, r: () => number) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  const base = weekday === 0 ? 52 : weekday === 6 ? 47 : weekday === 5 ? 36 : 29;
  const trend = 1 + (0.15 * (DEMO_ORDER_DAYS - daysAgo)) / DEMO_ORDER_DAYS;
  return Math.round(base * trend + (r() - 0.5) * 8);
}

/** A time of day: the morning rush peaks around 9 am; lunch around 1 pm; evening around 7:30 pm. */
function minuteOfDay(part: "morning" | "lunch" | "evening", r: () => number) {
  const tri = () => (r() + r()) / 2; // peaks in the middle
  if (part === "morning") return 7 * 60 + 30 + Math.floor(tri() * 210); // 7:30 to 11:00
  if (part === "lunch") return 12 * 60 + Math.floor(tri() * 180); // 12:00 to 15:00
  return 16 * 60 + Math.floor(tri() * 390); // 16:00 to 22:30
}

function orderItems(part: "morning" | "lunch" | "evening", r: () => number): OrderItem[] {
  const weights = Object.entries(WEIGHTS[part]) as [string, number][];
  const lines = pick(r, [[1, 45], [2, 38], [3, 17]] as [number, number][]);
  const qty = new Map<string, number>();
  for (let i = 0; i < lines; i++) {
    const id = pick(r, weights);
    const n = id.includes("chai") ? pick(r, [[1, 55], [2, 35], [3, 10]] as [number, number][]) : pick(r, [[1, 85], [2, 15]] as [number, number][]);
    qty.set(id, (qty.get(id) ?? 0) + n);
  }
  return [...qty].map(([id, n]) => {
    const m = MENU_ITEMS.find((i) => i.id === id)!;
    return { id, name: m.name, category: m.category, qty: n, unitPrice: m.price };
  });
}

/** About 2,300 sample orders for the 60 days up to `today` (India), none later than `now`. */
export function generateDemoOrders(today: string, now: Date = new Date()): DemoOrder[] {
  const out: DemoOrder[] = [];
  const nowMs = now.getTime();
  for (let ago = DEMO_ORDER_DAYS - 1; ago >= 0; ago--) {
    const day = addDays(today, -ago);
    const r = rng(hash(`solstice-orders-${day}`));
    const count = ordersOn(day, ago, r);
    for (let i = 0; i < count; i++) {
      const part = pick(r, [["morning", 40], ["lunch", 25], ["evening", 35]] as ["morning" | "lunch" | "evening", number][]);
      const at = atIndia(day, minuteOfDay(part, r)) + Math.floor(r() * 60_000);
      const items = orderItems(part, r);
      const channel = pick(r, [["walk_in", 45], ["whatsapp", 30], ["website", 25]] as [OrderChannel, number][]);
      const who = Math.floor(r() * NAMES.length);
      const fulfilment: Fulfilment | null = channel === "walk_in" ? null : r() < 0.55 ? "pickup" : "delivery";
      const source = channel === "website" ? pick(r, SOURCES) : null;
      if (at > nowMs) continue;
      out.push({
        createdAt: new Date(at).toISOString(),
        channel,
        items,
        fulfilment,
        name: channel === "walk_in" ? null : NAMES[who],
        phone: channel === "walk_in" ? null : `${DEMO_PHONE_PREFIX}6${String(who + 1).padStart(3, "0")}`,
        source,
      });
    }
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
