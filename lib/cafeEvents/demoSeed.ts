import { DEMO_PHONE_PREFIX } from "@/lib/bookings/demoPhones";
import type { PublicSource, Utm } from "@/lib/bookings/sources";
import type { EventTypeId, VenueId } from "@/demos/solstice-cafe/events";
import type { DemoEnquiry, EnquiryChannel, EnquiryStatus } from "./types";
import { addDays } from "./validation";

/**
 * Sample event enquiries for the cafe owner's list, so the demo looks like a working cafe (as lib/bookings/demoSeed.ts
 * does for the clinic). Deterministic: the same `today` and `now` always give the same rows. Every date is relative
 * to `today` (YYYY-MM-DD, India time): 22 enquiries received over the last 44 days, for events from 27 days ago to
 * 90 days ahead, at both venues, of every event type and status, from every public source, 4 of them sent via Ogi.
 * Names are common in Hyderabad and made up. Phones are in the demo block 90000 25001 to 25022 (lib/bookings/demoPhones.ts).
 */

type Row = {
  name: string;
  venue: VenueId;
  eventType: EventTypeId;
  /** Days before today the enquiry came in. */
  ago: number;
  /** The event day, in days from today. Negative = the event is over. */
  inDays: number;
  slot: string;
  guests: number;
  status: EnquiryStatus;
  source: PublicSource;
  channel: EnquiryChannel;
  campaign?: string;
  notes: string;
};

const ROWS: Row[] = [
  { name: "Sneha Reddy", venue: "courtyard", eventType: "birthday", ago: 0, inDays: 18, slot: "evening", guests: 30, status: "new", source: "website", channel: "form", notes: "Daughter's 7th birthday. Can we bring a magician?" },
  { name: "Mohammed Irfan", venue: "conservatory", eventType: "corporate", ago: 0, inDays: 9, slot: "afternoon", guests: 16, status: "new", source: "google_ads", channel: "form", campaign: "events-jubilee-hills", notes: "Quarterly team offsite. We need the screen for slides." },
  { name: "Pooja Agarwal", venue: "conservatory", eventType: "small_function", ago: 1, inDays: 12, slot: "brunch", guests: 12, status: "new", source: "meta_ads", channel: "ogi", campaign: "kitty-party-brunch", notes: "Kitty party. Mostly vegetarian, two guests eat Jain food." },
  { name: "Karthik Varma", venue: "courtyard", eventType: "birthday", ago: 2, inDays: 25, slot: "sundowner", guests: 22, status: "contacted", source: "google_search", channel: "form", notes: "Surprise 30th for my wife. Please keep it quiet if she calls." },
  { name: "Ayesha Siddiqui", venue: "conservatory", eventType: "small_function", ago: 3, inDays: 20, slot: "afternoon", guests: 18, status: "contacted", source: "website", channel: "ogi", notes: "Baby shower, pastel theme." },
  { name: "Rahul Chowdary", venue: "courtyard", eventType: "corporate", ago: 4, inDays: 14, slot: "evening", guests: 38, status: "confirmed", source: "google_ads", channel: "form", campaign: "events-jubilee-hills", notes: "Product launch dinner. Need a mic for a short speech." },
  { name: "Divya Goud", venue: "courtyard", eventType: "other", ago: 5, inDays: 32, slot: "morning", guests: 20, status: "new", source: "google_maps", channel: "form", notes: "Engagement get-together, about 20 from both families." },
  { name: "Srikanth Naidu", venue: "conservatory", eventType: "corporate", ago: 6, inDays: 7, slot: "brunch", guests: 10, status: "confirmed", source: "whatsapp", channel: "form", notes: "Book club's yearly meet-up. A quiet table, please." },
  { name: "Lavanya Kumari", venue: "courtyard", eventType: "birthday", ago: 7, inDays: 4, slot: "sundowner", guests: 25, status: "confirmed", source: "meta_ads", channel: "form", campaign: "birthday-garden", notes: "Grandmother's 80th. She uses a wheelchair." },
  { name: "Imran Baig", venue: "conservatory", eventType: "other", ago: 8, inDays: 45, slot: "evening", guests: 14, status: "declined", source: "google_search", channel: "form", notes: "Wanted a live band. Told them soft music only in this room." },
  { name: "Meghana Jain", venue: "conservatory", eventType: "small_function", ago: 9, inDays: 16, slot: "brunch", guests: 20, status: "confirmed", source: "website", channel: "form", notes: "Kitty party, all vegetarian, Jain options for six." },
  { name: "Vamsi Krishna", venue: "courtyard", eventType: "corporate", ago: 10, inDays: 60, slot: "evening", guests: 40, status: "contacted", source: "google_ads", channel: "form", campaign: "events-jubilee-hills", notes: "Annual day for a 40-person startup. Asked about a projector outdoors." },
  { name: "Zainab Fatima", venue: "conservatory", eventType: "birthday", ago: 12, inDays: 2, slot: "afternoon", guests: 12, status: "confirmed", source: "website", channel: "ogi", notes: "Sweet sixteen. Pink and gold balloons." },
  { name: "Harsha Vardhan", venue: "courtyard", eventType: "other", ago: 14, inDays: 90, slot: "morning", guests: 30, status: "contacted", source: "google_maps", channel: "form", notes: "Farewell brunch for a colleague moving to Pune." },
  { name: "Shruti Kapoor", venue: "conservatory", eventType: "small_function", ago: 15, inDays: -3, slot: "brunch", guests: 15, status: "confirmed", source: "meta_ads", channel: "form", campaign: "kitty-party-brunch", notes: "Baby shower for my sister." },
  { name: "Aditya Sharma", venue: "courtyard", eventType: "birthday", ago: 20, inDays: -6, slot: "evening", guests: 28, status: "confirmed", source: "website", channel: "form", notes: "35th birthday. Bringing a cake from outside." },
  { name: "Sana Hussain", venue: "conservatory", eventType: "corporate", ago: 22, inDays: -10, slot: "afternoon", guests: 9, status: "declined", source: "whatsapp", channel: "form", notes: "Needed the room for five hours. We only offer three." },
  { name: "Bhargav Reddy", venue: "courtyard", eventType: "other", ago: 25, inDays: -12, slot: "sundowner", guests: 35, status: "confirmed", source: "google_ads", channel: "form", campaign: "events-jubilee-hills", notes: "College reunion, batch of 2012." },
  { name: "Nikhila Rao", venue: "conservatory", eventType: "birthday", ago: 28, inDays: -15, slot: "evening", guests: 20, status: "confirmed", source: "google_search", channel: "ogi", notes: "Husband's 40th. A surprise." },
  { name: "Arjun Rao", venue: "courtyard", eventType: "corporate", ago: 33, inDays: -18, slot: "morning", guests: 24, status: "declined", source: "website", channel: "form", notes: "The date clashed with another booking." },
  { name: "Fatima Khan", venue: "conservatory", eventType: "small_function", ago: 38, inDays: -21, slot: "brunch", guests: 16, status: "confirmed", source: "google_maps", channel: "form", notes: "Lunch for close family after a nikah." },
  { name: "Ravi Teja", venue: "courtyard", eventType: "birthday", ago: 44, inDays: -27, slot: "evening", guests: 32, status: "confirmed", source: "website", channel: "form", notes: "Son's 18th. His own playlist until 10:30." },
];

/** First-touch details that match each source, as the browser would have kept them. */
function utmFor(r: Row, i: number): Utm {
  const landing = i % 3 === 0 ? "/cafe/website" : `/cafe/website/events/${r.venue}`;
  switch (r.source) {
    case "google_ads":
      return { utm_source: "google", utm_medium: "cpc", utm_campaign: r.campaign, gclid: `demo-gclid-${i + 1}`, landing };
    case "meta_ads":
      return { utm_source: i % 2 ? "instagram" : "facebook", utm_medium: "paid_social", utm_campaign: r.campaign, fbclid: `demo-fbclid-${i + 1}`, landing };
    case "google_maps":
      return { referrer: "maps.google.com", landing };
    case "google_search":
      return { referrer: "www.google.com", landing };
    case "whatsapp":
      return { utm_source: "whatsapp", landing };
    default:
      return { landing };
  }
}

const IST_MS = (5 * 60 + 30) * 60 * 1000;
const MINUTE = 60 * 1000;

/** A moment on a YYYY-MM-DD India day at hh:mm India time, as an ISO string. */
function atIndia(day: string, minutesIntoDay: number) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_MS + minutesIntoDay * MINUTE).toISOString();
}

/** The 22 sample enquiries for `today` (India). `now` keeps today's arrivals and every status change in the past. */
export function generateDemoEnquiries(today: string, now: Date = new Date()): DemoEnquiry[] {
  const nowMs = now.getTime();
  return ROWS.map((r, i) => {
    // Received between 9 am and about 7 pm, never later than now.
    const received = Math.min(Date.parse(atIndia(addDays(today, -r.ago), 9 * 60 + ((i * 37) % 600))), nowMs - (i + 1) * 20 * MINUTE);
    // The owner answered the next day, or a few minutes ago for anything that came in since.
    const updated = r.status === "new" ? null : new Date(Math.min(received + 20 * 60 * MINUTE, nowMs - 5 * MINUTE)).toISOString();
    return {
      venue: r.venue,
      eventType: r.eventType,
      date: addDays(today, r.inDays),
      slot: r.slot,
      guests: r.guests,
      name: r.name,
      phone: `${DEMO_PHONE_PREFIX}5${String(i + 1).padStart(3, "0")}`,
      notes: r.notes,
      source: r.source,
      campaign: r.campaign ?? null,
      utm: utmFor(r, i),
      channel: r.channel,
      createdAt: new Date(received).toISOString(),
      status: r.status,
      statusUpdatedAt: updated,
    };
  });
}
