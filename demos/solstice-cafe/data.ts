/**
 * Solstice Roastery & Bakehouse: a made-up cafe for the Cafe → Website demo.
 * Ported from the Google AI Studio export Abhinav supplied (24 Oct 2026). The business, people and address are made up.
 */

/** The onlydevs demo WhatsApp number. Every wa.me link on the Solstice demo is built from it. */
export const WHATSAPP_NUMBER = "917382130063";
export const WHATSAPP_DISPLAY = "+91 73821 30063";

/** A wa.me chat with the demo number, with the message typed in when there is one. */
export function whatsAppHref(text?: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const cafe = {
  name: "Solstice Roastery & Bakehouse",
  wordmark: "Solstice Jubilee",
  title: "Solstice Roastery & Bakehouse — Jubilee Hills",
  description:
    "A sunlit specialty coffee roastery, artisanal Irani chai bar, and sourdough bakehouse on Road No. 45, Jubilee Hills, Hyderabad.",
  address: "Plot 284/A, Road No. 45, Nandagiri Hills Junction, Jubilee Hills, Hyderabad, Telangana 500033",
  shortAddress: "Plot 284/A, Road No. 45, Jubilee Hills, Hyderabad",
};

export type Category =
  | "All Offerings"
  | "Specialty Arabica Brews"
  | "Artisanal Irani Chai"
  | "Deccan Spiced Pizzas"
  | "Fresh Osmania Croissants";

export type MenuItem = {
  id: string;
  name: string;
  category: Exclude<Category, "All Offerings">;
  price: number;
  description: string;
  originOrPrep: string;
  dietaryNote: string;
  imageUrl: string;
  illustrationVariant: string;
};

const IMG = "/demos/solstice";

export const images = {
  hero: `${IMG}/hero-cafe.jpg`,
  courtyard: `${IMG}/location-courtyard.jpg`,
};

export const CATEGORIES: Category[] = [
  "All Offerings",
  "Specialty Arabica Brews",
  "Artisanal Irani Chai",
  "Deccan Spiced Pizzas",
  "Fresh Osmania Croissants",
];

export const RUNNING_STRIP_ANNOUNCEMENTS = [
  "FRESH OSMANIA CROISSANTS OUT OF THE DECK OVEN AT 07:30 AM & 04:00 PM",
  "100% DIRECT-TRADE ARAKU VALLEY & CHIKMAGALUR ARABICA ROASTED IN-HOUSE",
  "DUM-BREWED ZAFRANI IRANI CHAI SERVED ALL DAY IN THE CONSERVATORY",
  "48-HOUR COLD-FERMENTED WOOD-FIRED DECCAN SOURDOUGH PIZZAS FROM 11:30 AM",
  "COMPLIMENTARY VALET PARKING & EV CHARGING AT PLOT 284, ROAD NO. 45, JUBILEE HILLS",
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "araku-pour-over",
    name: "Araku Honey-Process V60",
    category: "Specialty Arabica Brews",
    price: 340,
    description: "Single-estate 1,100m Araku Valley harvest with notes of wild forest blossom, nectarine, and raw jaggery.",
    originOrPrep: "Light-Medium Roast",
    dietaryNote: "Hot or Japanese Iced",
    imageUrl: `${IMG}/araku-pourover.jpg`,
    illustrationVariant: "arabica-pourover",
  },
  {
    id: "chikmagalur-cortado",
    name: "Ratnagiri Estate Cortado",
    category: "Specialty Arabica Brews",
    price: 310,
    description: "Double ristretto pulled from natural-process Ratnagiri beans balanced with equal parts silky organic A2 microfoam.",
    originOrPrep: "92-Point Lot",
    dietaryNote: "Oat Milk Available",
    imageUrl: `${IMG}/ratnagiri-cortado.jpg`,
    illustrationVariant: "spanish-cortado",
  },
  {
    id: "gondhoraj-espresso-tonic",
    name: "Gondhoraj Cold Brew Tonic",
    category: "Specialty Arabica Brews",
    price: 360,
    description:
      "18-hour cold-steeped Chikmagalur Arabica layered over artisanal Indian botanical tonic and fragrant Gondhoraj lime zest.",
    originOrPrep: "18-Hr Steep",
    dietaryNote: "House Signature",
    imageUrl: `${IMG}/cold-brew-tonic.jpg`,
    illustrationVariant: "cold-brew-tonic",
  },
  {
    id: "niloufer-heritage-chai",
    name: "Charminar Saffron Irani Chai",
    category: "Artisanal Irani Chai",
    price: 220,
    description:
      "Slow-reduced buffalo milk simmered with Pampore Mongra saffron, crushed green cardamom, and Assam orthodox leaf decoction.",
    originOrPrep: "Slow-Simmered 3 Hrs",
    dietaryNote: "Served in Bone China",
    imageUrl: `${IMG}/irani-chai.jpg`,
    illustrationVariant: "irani-chai",
  },
  {
    id: "zafrani-malai-chai",
    name: "Rose & Pistachio Malai Chai",
    category: "Artisanal Irani Chai",
    price: 250,
    description:
      "Velvety dum-brewed Irani chai crowned with a spoonful of clotted house malai, Damascus rose petals, and roasted Iranian pistachios.",
    originOrPrep: "Dum-Brewed",
    dietaryNote: "House Favourite",
    imageUrl: `${IMG}/malai-chai.jpg`,
    illustrationVariant: "zafrani-malai-chai",
  },
  {
    id: "sulaimani-hibiscus-chai",
    name: "Deccan Spiced Sulaimani Tea",
    category: "Artisanal Irani Chai",
    price: 210,
    description: "Clarified amber Nilgiri black tea infused with whole star anise, Malabar cloves, fresh mint, and a squeeze of sweet lime.",
    originOrPrep: "Single-Estate Nilgiri",
    dietaryNote: "Light & Aromatic",
    imageUrl: `${IMG}/sulaimani-tea.jpg`,
    illustrationVariant: "irani-chai",
  },
  {
    id: "tellicherry-burrata-pizza",
    name: "Tellicherry & Fresh Burrata Sourdough",
    category: "Deccan Spiced Pizzas",
    price: 780,
    description:
      "48-hour cold-fermented sourdough crust blistered in our stone deck oven with San Marzano tomatoes, whole burrata, and cracked Tellicherry pepper.",
    originOrPrep: "48-Hr Sourdough",
    dietaryNote: "11-Inch Wood-Fired",
    imageUrl: `${IMG}/burrata-pizza.jpg`,
    illustrationVariant: "deccan-pizza",
  },
  {
    id: "gongura-pesto-pizza",
    name: "Gongura & Confit Garlic Flatbread",
    category: "Deccan Spiced Pizzas",
    price: 740,
    description:
      "Tangy Deccan sorrel leaf pesto, slow-roasted Guntur chilli oil, caramelized shallots, and aged stracciatella on airy sourdough.",
    originOrPrep: "Deccan Heritage",
    dietaryNote: "Vegetarian",
    imageUrl: `${IMG}/gongura-flatbread.jpg`,
    illustrationVariant: "gongura-burrata-pizza",
  },
  {
    id: "karampodi-mushroom-pizza",
    name: "Wild Mushroom & Ghee Karampodi Pizza",
    category: "Deccan Spiced Pizzas",
    price: 760,
    description:
      "Roasted oyster and shiitake mushrooms finished with fragrant Andhra roasted lentil karampodi, A2 cultured ghee, and thyme.",
    originOrPrep: "Stone Deck Oven",
    dietaryNote: "Chef’s Special",
    imageUrl: `${IMG}/mushroom-pizza.jpg`,
    illustrationVariant: "deccan-pizza",
  },
  {
    id: "osmania-salted-croissant",
    name: "Classic Osmania Butter Croissant",
    category: "Fresh Osmania Croissants",
    price: 290,
    description:
      "27-layer French cultured butter viennoiserie infused with the iconic sweet-and-salty custard warmth of Hyderabad’s heritage Osmania biscuit.",
    originOrPrep: "Baked 7:30 AM & 4:00 PM",
    dietaryNote: "Cultured French Butter",
    imageUrl: `${IMG}/osmania-croissant.jpg`,
    illustrationVariant: "osmania-croissant",
  },
  {
    id: "pistachio-cardamom-cruffin",
    name: "Zafrani Pistachio & Cardamom Twice-Baked",
    category: "Fresh Osmania Croissants",
    price: 340,
    description: "Flaky Osmania croissant filled with roasted green pistachio frangipane, saffron glaze, and crushed cardamom sugar.",
    originOrPrep: "Small Batch Daily",
    dietaryNote: "Contains Nuts",
    imageUrl: `${IMG}/pistachio-cruffin.jpg`,
    illustrationVariant: "osmania-croissant",
  },
  {
    id: "dark-choc-sea-salt-pain",
    name: "Godavari 70% Cacao Pain au Chocolat",
    category: "Fresh Osmania Croissants",
    price: 320,
    description:
      "Crisp laminated Osmania pastry wrapped around twin batons of single-origin 70% West Godavari dark chocolate and flaky sea salt.",
    originOrPrep: "Single-Origin Cacao",
    dietaryNote: "Warm from Oven",
    imageUrl: `${IMG}/pain-au-chocolat.jpg`,
    illustrationVariant: "osmania-croissant",
  },
];

export const VIBE_SPACES = [
  {
    index: "01 / Courtyard",
    title: "01. The Glasshouse Conservatory",
    description:
      "North-facing clerestory windows flood our travertine communal tables with glare-free daylight from 7:30 AM until golden hour, surrounded by indoor ficus and terracotta planters.",
    imageUrl: `${IMG}/vibe-conservatory.jpg`,
    imageAlt: "Sunlit glasshouse conservatory seating with natural light and greenery",
  },
  {
    index: "02 / Roastery",
    title: "02. In-House Probat Micro-Roastery",
    description:
      "Every Tuesday and Friday morning, our head roaster profiles small-lot Araku Valley and Chikmagalur harvests on-site, ensuring every espresso shot is rested 7 to 14 days for peak sweetness.",
    imageUrl: `${IMG}/vibe-roastery.jpg`,
    imageAlt: "Artisanal specialty coffee roasting and espresso preparation",
  },
  {
    index: "03 / Bakehouse",
    title: "03. Heritage Sourdough & Viennoiserie",
    description:
      "Our temperature-controlled lamination room crafts Osmania-spiced croissants and wild-fermented sourdough crusts using unbleached stone-milled Emmer and Khapli flours.",
    imageUrl: `${IMG}/vibe-bakehouse.jpg`,
    imageAlt: "Freshly baked golden croissants and sourdough pastries in the bakehouse",
  },
];

export const RESERVATION_TIMES = [
  { value: "08:00 AM", label: "08:00 AM · Morning Pour-Over" },
  { value: "09:00 AM", label: "09:00 AM · Breakfast & Croissants" },
  { value: "12:30 PM", label: "12:30 PM · Sourdough Pizza Lunch" },
  { value: "04:30 PM", label: "04:30 PM · Irani Chai & Golden Hour" },
  { value: "08:00 PM", label: "08:00 PM · Evening Conservatory" },
];

export const PARTY_SIZES = [
  { value: "1 Guest", label: "1 Guest (Work Table)" },
  { value: "2 Guests", label: "2 Guests (Courtyard Two-Top)" },
  { value: "4 Guests", label: "4 Guests (Limestone Booth)" },
  { value: "6 Guests", label: "6 Guests (Conservatory Long Table)" },
];

export const DELIVERY_OPTIONS = ["Courtyard Pickup", "Jubilee Hills Delivery"] as const;
export type DeliveryOption = (typeof DELIVERY_OPTIONS)[number];

export type CartEntry = { item: MenuItem; qty: number };

/** The order text sent to WhatsApp, as the original site built it. */
export function orderMessage(entries: CartEntry[], delivery: DeliveryOption, name: string) {
  const total = entries.reduce((sum, e) => sum + e.item.price * e.qty, 0);
  return [
    `Hello Solstice Jubilee Hills! I would like to place an order (${delivery}):`,
    "",
    ...entries.map(({ item, qty }) => `• ${qty}x ${item.name} — ₹${item.price * qty}`),
    "",
    `Total: ₹${total}`,
    name.trim() ? `Name: ${name.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type Reservation = { date: string; time: string; guests: string; phone: string };

export function reservationMessage(r: Reservation) {
  return [
    "Hello Solstice Jubilee Hills! I would like to reserve a courtyard table.",
    "",
    `Date: ${r.date}`,
    `Time: ${r.time}`,
    `Party: ${r.guests}`,
    `Mobile: ${r.phone.trim()}`,
  ].join("\n");
}

/** An Indian mobile number: 10 digits starting 6 to 9, with an optional +91, 91 or 0 in front. Spaces and dashes are fine. */
export function isIndianMobile(value: string) {
  return /^(?:\+?91|0)?[6-9]\d{9}$/.test(value.replace(/[\s-]/g, ""));
}

/** Errors for a reservation, by field. `today` is YYYY-MM-DD in the visitor's time zone. Empty when it is fine. */
export function reservationErrors(r: Reservation, today: string): Partial<Record<keyof Reservation, string>> {
  const errors: Partial<Record<keyof Reservation, string>> = {};
  if (!r.date) errors.date = "Pick a date.";
  else if (today && r.date < today) errors.date = "Pick today or a later date.";
  if (!r.phone.trim()) errors.phone = "Enter your mobile number.";
  else if (!isIndianMobile(r.phone)) errors.phone = "Enter a 10-digit Indian mobile number.";
  return errors;
}
