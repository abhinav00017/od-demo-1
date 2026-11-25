/**
 * Events at Solstice: the two venues a visitor can enquire about for a party or a small function (decided 25 Nov 2026).
 * Plain data, shared by the home page cards, the venue pages, the enquiry form and the server's checks.
 * The venues, prices and details are made up for the demo. The cafe confirms the final quote.
 *
 * Photo credits. Photos under /demos/solstice/events/ are free Unsplash photos (Unsplash License), downloaded
 * on 25 Nov 2026 and resized to 1100 px wide. The other two are the cafe's own demo photos.
 */

export type VenueId = "courtyard" | "conservatory";

export type VenuePhoto = {
  src: string;
  alt: string;
  /** Where an Unsplash photo came from. Missing for the cafe's own demo photos. */
  credit?: { photographer: string; sourceUrl: string };
};

export type VenueSlot = { id: string; label: string; time: string };

export type Venue = {
  id: VenueId;
  name: string;
  /** One short line under the name, like "Outdoor garden". */
  kind: string;
  /** One sentence for the home page card. */
  short: string;
  /** Two or three sentences at the top of the venue page. */
  intro: string;
  /** Guests the venue takes for a private event. */
  minGuests: number;
  maxGuests: number;
  /** The "from" price per guest, in rupees. */
  pricePerGuest: number;
  photos: readonly VenuePhoto[];
  included: readonly string[];
  goodFor: readonly string[];
  slots: readonly VenueSlot[];
  /** Practical notes: weather, music, decor. */
  notes: readonly string[];
};

const IMG = "/demos/solstice";

export const VENUES: readonly Venue[] = [
  {
    id: "courtyard",
    name: "The Courtyard",
    kind: "Outdoor garden under the neem trees",
    short: "Our open-air garden, strung with warm lights. Made for birthdays and parties.",
    intro:
      "The Courtyard is the garden at the heart of the bungalow. Old neem trees give shade by day, and string lights take over at dusk. Book it for your group and it is yours for three hours.",
    minGuests: 15,
    maxGuests: 40,
    pricePerGuest: 1200,
    photos: [
      {
        src: `${IMG}/events/courtyard-gazebo-lights.jpg`,
        alt: "A garden pavilion with white drapes, sofas and string lights at dusk",
        credit: { photographer: "Randy Fath", sourceUrl: "https://unsplash.com/photos/csK5XPO87lI" },
      },
      {
        src: `${IMG}/events/courtyard-bunting-lights.jpg`,
        alt: "Bulb lights and paper bunting strung between trees in a garden",
        credit: { photographer: "Liana S", sourceUrl: "https://unsplash.com/photos/N6b_6A0azv8" },
      },
      {
        src: `${IMG}/events/courtyard-candle-table.jpg`,
        alt: "A long table outdoors set with tall candles, lavender and glassware in evening sun",
        credit: { photographer: "Kandid Picnic", sourceUrl: "https://unsplash.com/photos/P-Q7-fTTbdI" },
      },
      {
        src: `${IMG}/events/courtyard-shared-table.jpg`,
        alt: "Friends sharing plates of food at a wooden garden table",
        credit: { photographer: "Lee Myungseong", sourceUrl: "https://unsplash.com/photos/y1XXWct5rBo" },
      },
      { src: `${IMG}/location-courtyard.jpg`, alt: "Outdoor cafe tables among potted plants on the Solstice terrace" },
    ],
    included: [
      "The whole garden for your group, for three hours",
      "A set menu: wood-fired pizzas, small plates, Irani chai and cold coffee",
      "String lights, table linen and simple flowers",
      "A cake table, with a knife and plates (bring your cake or order ours)",
      "Your own playlist on our garden speakers, until 10:30 PM",
      "One host from our team for the whole event",
    ],
    goodFor: ["Birthday parties", "Anniversaries", "Engagement get-togethers", "Farewells", "Family lunches"],
    slots: [
      { id: "morning", label: "Morning", time: "8:00 – 11:00 AM" },
      { id: "sundowner", label: "Sundowner", time: "4:00 – 7:00 PM" },
      { id: "evening", label: "Evening", time: "7:30 – 10:30 PM" },
    ],
    notes: [
      "In the monsoon (June to September) we put up a canopy over the main tables.",
      "Balloons and banners are welcome. Please no confetti or open fire in the garden.",
    ],
  },
  {
    id: "conservatory",
    name: "The Conservatory",
    kind: "Private glasshouse room",
    short: "A private, air-conditioned glass room full of plants. Made for small functions.",
    intro:
      "The Conservatory is our glasshouse room, filled with daylight and indoor plants. It has its own door, so your group has the room to itself. It suits smaller, quieter functions.",
    minGuests: 8,
    maxGuests: 20,
    pricePerGuest: 1500,
    photos: [
      {
        src: `${IMG}/events/conservatory-arched-windows.jpg`,
        alt: "A round dining table with flowers in front of tall arched windows and a garden view",
        credit: { photographer: "Jez Timms", sourceUrl: "https://unsplash.com/photos/XMXuiLoZlFY" },
      },
      {
        src: `${IMG}/events/conservatory-long-table.jpg`,
        alt: "Long tables set for a meal inside a glasshouse full of climbing plants",
        credit: { photographer: "Robert Vasquez", sourceUrl: "https://unsplash.com/photos/WaVL6PfjWI4" },
      },
      {
        src: `${IMG}/events/conservatory-sunroom.jpg`,
        alt: "A sunroom with hanging glass lamps, a wooden table and many plants",
        credit: { photographer: "Louis Thai", sourceUrl: "https://unsplash.com/photos/t2io59eMLhY" },
      },
      {
        src: `${IMG}/events/conservatory-green-room.jpg`,
        alt: "A bright room with a set table, wooden chairs and hanging plants by the windows",
        credit: { photographer: "Daria Chertkova", sourceUrl: "https://unsplash.com/photos/RZNT9xIcK4c" },
      },
      { src: `${IMG}/vibe-conservatory.jpg`, alt: "The Solstice cafe counter and garden chairs, next to the conservatory" },
    ],
    included: [
      "The private room for your group, for three hours",
      "A set menu with a welcome drink, small plates, mains and dessert",
      "Air conditioning, Wi-Fi, and a screen you can connect a laptop to",
      "Table styling in a colour of your choice",
      "A cake table, with a knife and plates (bring your cake or order ours)",
      "One host from our team for the whole event",
    ],
    goodFor: ["Kitty parties", "Baby showers", "Team meet-ups", "Small family functions", "Book clubs"],
    slots: [
      { id: "brunch", label: "Brunch", time: "11:00 AM – 2:00 PM" },
      { id: "afternoon", label: "Afternoon", time: "3:00 – 6:00 PM" },
      { id: "evening", label: "Evening", time: "7:00 – 10:00 PM" },
    ],
    notes: [
      "The room is step-free and close to the washrooms.",
      "Soft music only, as the main cafe is next door.",
    ],
  },
];

export const EVENT_TYPES = [
  { id: "birthday", label: "Birthday" },
  { id: "small_function", label: "Small function" },
  { id: "corporate", label: "Corporate or team" },
  { id: "other", label: "Other" },
] as const;

export type EventTypeId = (typeof EVENT_TYPES)[number]["id"];

/** How far ahead a visitor can ask for a date. */
export const MAX_DAYS_AHEAD = 180;

/** Where the venue pages live. */
export const EVENTS_BASE = "/cafe/website/events";

export function venueById(id: unknown): Venue | undefined {
  return VENUES.find((v) => v.id === id);
}

export function venueHref(venue: Venue) {
  return `${EVENTS_BASE}/${venue.id}`;
}

/** Rupees the Indian way, like ₹1,200 or ₹18,000. */
export function rupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** "From ₹1,200 per guest". */
export function fromPrice(venue: Venue) {
  return `From ${rupees(venue.pricePerGuest)} per guest`;
}

/** "Minimum 15 guests, so from ₹18,000". */
export function minimumLine(venue: Venue) {
  return `Minimum ${venue.minGuests} guests, so from ${rupees(venue.pricePerGuest * venue.minGuests)}`;
}

export function eventTypeLabel(id: string) {
  return EVENT_TYPES.find((t) => t.id === id)?.label ?? id;
}

export function slotLabel(venue: Venue | undefined, slotId: string) {
  const slot = venue?.slots.find((s) => s.id === slotId);
  return slot ? `${slot.label}, ${slot.time}` : slotId;
}
