/**
 * ShowSalsa: a made-up event ticketing platform for the Ticketing platform live demo.
 * Ported from the Google AI Studio export Abhinav supplied (24 Oct 2026). Every event, artist, venue, promoter and
 * price is made up. The export named real artists, venues and promoters; those names were replaced.
 *
 * Photos are from Unsplash (unsplash.com/photos/<id>), downloaded once into public/demos/showsalsa/ at the largest
 * width the export asked for (300 px for portraits, up to 1400 px for event photos):
 *   event-tidal-goa.jpg          photo-1516450360452-9312f5e86fc7
 *   event-aurora-mumbai.jpg      photo-1470225620780-dba8ba36b745
 *   event-comedy-bengaluru.jpg   photo-1585699324551-f6c309eedeca
 *   event-back-to-black.jpg      photo-1545128485-c400e7702796
 *   event-born-to-shine.jpg      photo-1514525253161-7a46d19cd819
 *   event-halloween-thane.jpg    photo-1509557965875-b88c97052f0e
 *   event-auto-fest.jpg          photo-1503376780353-7e6692767b70
 *   event-filmy-pune.jpg         photo-1492684223066-81342ee5ff30
 *   event-lanterns-delhi.jpg     photo-1501386761578-eac5c94b800a
 *   event-phulkari-pune.jpg      photo-1511671782779-c97d3d27a1d4
 *   event-mixology-mumbai.jpg    photo-1514362545857-3bc16c4c7d1b
 *   event-moonlit-flea.jpg       photo-1533174072545-7a4b6ad7a6c3
 *   event-saturday-socials.jpg   photo-1508700115892-45ecd05ae2ad
 *   portrait-01.jpg … portrait-12.jpg, in PORTRAITS order:
 *     1570295999919-56ceb5ecca61, 1534528741775-53994a69daeb, 1517841905240-472988babdf9, 1507003211169-0a1dd7228f2d,
 *     1500648767791-00dcc994a43e, 1506794778202-cad84cf45f1d, 1519085360753-af0119f7cbe7, 1492562080023-ab3db95bfbce,
 *     1535713875002-d1d0cf377fde, 1568602471122-7832951cc4c5, 1522075469751-3a6694fb2f61, 1544005313-94ddf0286df2
 */

/** The onlydevs demo WhatsApp number. Every WhatsApp link and prefilled phone on the ShowSalsa demo comes from it. */
export const WHATSAPP_NUMBER = "917382130063";
export const WHATSAPP_DISPLAY = "+91 73821 30063";

/** A wa.me chat with the demo number, with the message typed in when there is one. */
export function whatsAppHref(text?: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const site = {
  name: "ShowSalsa",
  title: "ShowSalsa",
  description:
    "Discover flagship concerts, underground techno nights, stand-up comedy specials, and curated cultural festivals across India with instant QR ticketing.",
};

export type EventCategory = "All" | "Music & Gigs" | "Nightlife" | "Comedy" | "Festivals" | "Workshops" | "Flea Markets";

export type DateFilter = "Any" | "Today" | "This Week" | "This Month";

export type CityName = "All Cities" | "Mumbai" | "Bengaluru" | "Hyderabad" | "Delhi NCR" | "Goa" | "Pune" | "Nagpur";

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  description: string;
  perks: string[];
  availableCount: number;
  badge?: string;
}

export interface LineupArtist {
  name: string;
  role: string;
  avatar: string;
}

export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  category: Exclude<EventCategory, "All">;
  city: Exclude<CityName, "All Cities">;
  venue: string;
  address: string;
  dateLabel: string;
  timeLabel: string;
  dateFilterBucket: Exclude<DateFilter, "Any">;
  /** 0 means free onwards. */
  startingPrice: number;
  /** A photo in public/demos/showsalsa/. */
  image: string;
  /** Three colours for the poster gradient behind the photo (the export's Tailwind from/via/to steps, in hex). */
  poster: [string, string, string];
  posterTagline: string;
  isTrending?: boolean;
  isCuratedExclusive?: boolean;
  isSpotlight?: boolean;
  isNewlyAdded?: boolean;
  ageLimit: string;
  duration: string;
  language: string;
  description: string;
  dateSlots: string[];
  timeSlots: string[];
  lineup: LineupArtist[];
  tiers: TicketTier[];
  mapCoordinates: { lat: number; lng: number; area: string };
}

export interface CartCalculation {
  subtotal: number;
  bookingFee: number;
  gstAmount: number;
  discountAmount: number;
  grandTotal: number;
  totalTickets: number;
}

export interface BookingRecord {
  bookingId: string;
  eventId: string;
  eventTitle: string;
  venue: string;
  city: string;
  dateSlot: string;
  timeSlot: string;
  items: { tierName: string; quantity: number; unitPrice: number }[];
  totalPaid: number;
  bookedAt: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
}

const photo = (name: string) => `/demos/showsalsa/${name}.jpg`;

export const PHOTOS = {
  tidalGoa: photo("event-tidal-goa"),
  auroraMumbai: photo("event-aurora-mumbai"),
  comedyBengaluru: photo("event-comedy-bengaluru"),
  backToBlack: photo("event-back-to-black"),
  bornToShine: photo("event-born-to-shine"),
  halloweenThane: photo("event-halloween-thane"),
  autoFest: photo("event-auto-fest"),
  filmyPune: photo("event-filmy-pune"),
  lanternsDelhi: photo("event-lanterns-delhi"),
  phulkariPune: photo("event-phulkari-pune"),
  mixologyMumbai: photo("event-mixology-mumbai"),
  moonlitFlea: photo("event-moonlit-flea"),
  saturdaySocials: photo("event-saturday-socials"),
};

export const PORTRAITS = Array.from({ length: 12 }, (_, i) => photo(`portrait-${String(i + 1).padStart(2, "0")}`));

/** The CSS gradient behind an event photo, as the export's `bg-gradient-to-*` poster classes drew it. */
export function posterGradient(colors: EventItem["poster"], direction: "to bottom" | "to bottom right" = "to bottom right") {
  return `linear-gradient(${direction}, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
}

export const CITIES: CityName[] = ["All Cities", "Mumbai", "Bengaluru", "Delhi NCR", "Hyderabad", "Goa", "Pune", "Nagpur"];

export const CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: "All", label: "All Experiences" },
  { id: "Music & Gigs", label: "Music & Gigs" },
  { id: "Nightlife", label: "Nightlife & Club" },
  { id: "Comedy", label: "Stand-Up Comedy" },
  { id: "Festivals", label: "Festivals & Auto" },
  { id: "Workshops", label: "Masterclasses" },
  { id: "Flea Markets", label: "Food & Flea" },
];

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: "evt-kairav-goa",
    title: "DJ Kairav Live at Tidal Goa",
    subtitle: "The King of Mashups — Exclusive Waterfront Arena Takeover",
    category: "Nightlife",
    city: "Goa",
    venue: "Tidal Club, Vagator",
    address: "Ozran Beach Road, Small Vagator, Anjuna, Goa 403509",
    dateLabel: "24 Oct",
    timeLabel: "10:00 PM",
    dateFilterBucket: "Today",
    startingPrice: 2000,
    image: PHOTOS.tidalGoa,
    poster: ["#0c4a6e", "#172554", "#09090b"],
    posterTagline: "TIDAL VAGATOR · KAIRAV",
    isTrending: true,
    isSpotlight: true,
    isNewlyAdded: true,
    ageLimit: "21+ Only (Physical ID Mandatory)",
    duration: "5 Hours",
    language: "Hindi, English & Commercial EDM",
    description:
      "Brace yourself for an electrifying coastal night as DJ Kairav brings his signature audio-visual mashup production to Tidal Club Vagator. Featuring cryogenic CO2 cannons, 360-degree kinetic lasers, and an exclusive VIP cliffside deck.",
    dateSlots: ["Sat, 24 Oct", "Sun, 25 Oct"],
    timeSlots: ["09:00 PM Entry", "10:00 PM Headliner Set"],
    lineup: [
      {
        name: "DJ Kairav",
        role: "Headliner · Mashup & Bollywood EDM",
        avatar: PORTRAITS[0],
      },
      {
        name: "DJ Zenith",
        role: "Opening Act · Progressive House",
        avatar: PORTRAITS[1],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird General (Stag/Couple)",
        price: 2000,
        description: "General dancefloor access with ₹1,000 cover redeemable on F&B.",
        perks: ["Main Arena Access", "₹1,000 F&B Cover Included", "Express QR Entry"],
        availableCount: 42,
      },
      {
        id: "tier-vip",
        name: "VIP Fanpit & Elevated Deck",
        price: 3999,
        description: "Elevated stage-side deck with dedicated mixologist bar and zero-queue gate.",
        perks: ["Elevated Stage View", "₹2,000 Full Cover", "Dedicated VIP Bar & Restrooms"],
        availableCount: 18,
        badge: "MOST POPULAR",
      },
      {
        id: "tier-backstage",
        name: "Backstage VVIP Cabana Pass",
        price: 7499,
        description: "Ultra-luxury backstage lounge access with artist view and premium bottle service credit.",
        perks: ["Backstage Lounge Access", "Butler Service", "Complimentary Valet Parking"],
        availableCount: 6,
        badge: "LIMITED",
      },
    ],
    mapCoordinates: { lat: 15.596, lng: 73.7364, area: "Vagator Cliff, North Goa" },
  },
  {
    id: "evt-aurora-mumbai",
    title: "Aurora Sphere: Melodic Techno Odyssey",
    subtitle: "Immersive 4K Holographic Visuals & Underground Melodic Techno Showcase",
    category: "Music & Gigs",
    city: "Mumbai",
    venue: "Bayfront Grounds, BKC",
    address: "Bandra Kurla Complex, Bandra East, Mumbai 400051",
    dateLabel: "25 Oct",
    timeLabel: "06:00 PM",
    dateFilterBucket: "This Week",
    startingPrice: 2499,
    image: PHOTOS.auroraMumbai,
    poster: ["#4c0519", "#3b0764", "#09090b"],
    posterTagline: "BKC ARENA · 80FT IMAX LED",
    isTrending: true,
    isCuratedExclusive: true,
    isSpotlight: true,
    ageLimit: "21+ Only",
    duration: "6 Hours",
    language: "Melodic Techno & House",
    description:
      "Experience India’s largest bespoke outdoor monolithic LED stage at Bayfront Grounds, BKC. Custom spatial L-Acoustics sound system paired with towering cybernetic visuals and international underground selectors.",
    dateSlots: ["Sun, 25 Oct", "Mon, 26 Oct"],
    timeSlots: ["05:00 PM Sunset Gates", "08:00 PM Main Audio-Visual Show"],
    lineup: [
      {
        name: "Kasia & Mirela",
        role: "International Headliners · Melodic Techno",
        avatar: PORTRAITS[2],
      },
      {
        name: "Lumen (Live A/V)",
        role: "Special Guest · Live Modular Set",
        avatar: PORTRAITS[3],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird General Arena",
        price: 2499,
        description: "Standard standing arena access with clear sightlines to the 80ft visual monolith.",
        perks: ["Arena Standing Access", "RFID Cashless Wristband", "Curated Gourmet Food Village"],
        availableCount: 64,
      },
      {
        id: "tier-vip",
        name: "VIP Fanpit (Front of Stage)",
        price: 4499,
        description: "Up-close immersion right in front of the production booth with priority bar lanes.",
        perks: ["Front Row Fanpit Access", "Dedicated Craft Cocktail Lanes", "Fast-Track Gate 2 Entry"],
        availableCount: 25,
        badge: "SELLING FAST",
      },
      {
        id: "tier-backstage",
        name: "Backstage Skydeck Lounge",
        price: 8999,
        description: "Elevated central viewing platform with unlimited premium pours for 3 hours.",
        perks: ["Panoramic Skydeck View", "3-Hr Unlimited Premium Bar", "Artist Hospitality Lounge"],
        availableCount: 8,
        badge: "VIP EXCLUSIVE",
      },
    ],
    mapCoordinates: { lat: 19.0658, lng: 72.8677, area: "Bandra Kurla Complex, Mumbai" },
  },
  {
    id: "evt-rohan-mehra-blr",
    title: "Rohan Mehra — Unfiltered & Live",
    subtitle: "2-Hour Arena Stand-Up Special & Crowd Work Extravaganza",
    category: "Comedy",
    city: "Bengaluru",
    venue: "Richmond Hall Auditorium",
    address: "Richmond Road, Richmond Town, Bengaluru 560025",
    dateLabel: "24 Oct",
    timeLabel: "08:00 PM",
    dateFilterBucket: "Today",
    startingPrice: 999,
    image: PHOTOS.comedyBengaluru,
    poster: ["#451a03", "#450a0a", "#09090b"],
    posterTagline: "UNFILTERED · LIVE TOUR",
    isTrending: true,
    isCuratedExclusive: true,
    isSpotlight: true,
    ageLimit: "18+ Strictly (No Recording Allowed)",
    duration: "2 Hours",
    language: "Hindi & Hinglish",
    description:
      "After selling out arenas worldwide, Rohan Mehra brings his sharpest, darkest, and most spontaneous hour of stand-up comedy to Bengaluru. Phones will be sealed in pouches at the gate for a 100% unfiltered live experience.",
    dateSlots: ["Sat, 24 Oct", "Sun, 25 Oct"],
    timeSlots: ["05:30 PM Matinee Show", "08:30 PM Late Night Show"],
    lineup: [
      {
        name: "Rohan Mehra",
        role: "Headliner · Stand-Up & Crowd Work",
        avatar: PORTRAITS[4],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird Balcony Seating",
        price: 999,
        description: "Reserved theatre seating in the upper balcony with crystal-clear acoustics.",
        perks: ["Reserved Seat Number", "Air-Conditioned Theatre", "Instant QR M-Ticket"],
        availableCount: 30,
      },
      {
        id: "tier-vip",
        name: "VIP Orchestra Stall (Rows D–J)",
        price: 2499,
        description: "Prime center-stall seating safe from front-row roasting but close to the action.",
        perks: ["Prime Center View", "Priority Auditorium Entry", "Complimentary Beverage Voucher"],
        availableCount: 14,
        badge: "BEST VIEW",
      },
      {
        id: "tier-backstage",
        name: "Front Row Roast Pit + Meet & Greet",
        price: 4999,
        description: "Rows A–C direct interaction zone plus a post-show signed tour poster & photo op.",
        perks: ["Rows A–C Front Pit", "Post-Show Artist Meet & Photo", "Signed Tour Merchandise"],
        availableCount: 4,
        badge: "ONLY 4 LEFT",
      },
    ],
    mapCoordinates: { lat: 12.9716, lng: 77.5993, area: "Richmond Town, MG Road, Bengaluru" },
  },
  {
    id: "evt-back-to-black",
    title: "Back To Black — Friday Night Takeover",
    subtitle: "All-Black Dress Code · Featuring NOVA, DJ Rhea & DJ Vik",
    category: "Nightlife",
    city: "Nagpur",
    venue: "Ember Lounge, Nagpur",
    address: "VIP Road, Dharampeth Extension, Nagpur 440010",
    dateLabel: "23 Oct",
    timeLabel: "09:00 PM",
    dateFilterBucket: "Today",
    startingPrice: 0,
    image: PHOTOS.backToBlack,
    poster: ["#450a0a", "#18181b", "#000000"],
    posterTagline: "DRESS CODE: BLACK · FEAT. NOVA",
    isNewlyAdded: true,
    isTrending: true,
    ageLimit: "21+ Only",
    duration: "4.5 Hours",
    language: "Commercial, Hip-Hop & Tech House",
    description:
      "Step into the shadows at Ember for Back To Black. Strict all-black luxury dress code with guestlist entry for couples and ladies before 9:30 PM, headlined by NOVA alongside the Ember residents.",
    dateSlots: ["Fri, 23 Oct", "Sat, 24 Oct"],
    timeSlots: ["08:00 PM Doors Open", "09:00 PM Main Set"],
    lineup: [
      {
        name: "NOVA",
        role: "Headliner · Hip-Hop & Bass House",
        avatar: PORTRAITS[5],
      },
      {
        name: "DJ Rhea & DJ Vik",
        role: "Hosted By · Ember Residents",
        avatar: PORTRAITS[6],
      },
    ],
    tiers: [
      {
        id: "tier-free",
        name: "Early Bird Guestlist RSVP (Before 9:30 PM)",
        price: 0,
        description: "Complimentary couple/female entry prior to 9:30 PM in strict black attire.",
        perks: ["Free Entry Before 9:30 PM", "QR Pass Required at Gate", "Club Rules Apply"],
        availableCount: 20,
        badge: "FREE RSVP",
      },
      {
        id: "tier-eb",
        name: "Early Bird General Cover Pass",
        price: 999,
        description: "Guaranteed all-night entry with 100% redeemable cover charge on food & drinks.",
        perks: ["All-Night Guaranteed Entry", "₹999 Full F&B Cover", "No Time Restriction"],
        availableCount: 50,
      },
      {
        id: "tier-vip",
        name: "VIP Lounge Table (Up to 4 Guests)",
        price: 4999,
        description: "Reserved plush booth seating near the DJ console with dedicated server.",
        perks: ["Private Booth for 4", "₹4,500 Redeemable Cover", "VIP Priority Entry"],
        availableCount: 5,
      },
    ],
    mapCoordinates: { lat: 21.1458, lng: 79.0882, area: "Dharampeth, Nagpur" },
  },
  {
    id: "evt-born-to-shine",
    title: "BORN TO SHINE — Horizon Sundowner",
    subtitle: "Skyline Luxury Rooftop Session feat. Ashwin & Aman",
    category: "Nightlife",
    city: "Nagpur",
    venue: "Horizon Lounge, Wagdara",
    address: "Skyline Rooftop, Outer Ring Road, Wagdara, Nagpur 441108",
    dateLabel: "24 Oct",
    timeLabel: "08:30 PM",
    dateFilterBucket: "Today",
    startingPrice: 0,
    image: PHOTOS.bornToShine,
    poster: ["#ea580c", "#78350f", "#09090b"],
    posterTagline: "SKYLINE · ASHWIN X AMAN",
    isNewlyAdded: true,
    ageLimit: "21+ Only",
    duration: "5 Hours",
    language: "Punjabi Pop, Afro House & Bollywood",
    description:
      "High-octane Punjabi and Afro-house crossover showcase at Horizon Lounge. Featuring custom orange neon stage design, pyrotechnics, and signature cocktails.",
    dateSlots: ["Sat, 24 Oct"],
    timeSlots: ["07:00 PM Gates", "08:30 PM Showtime"],
    lineup: [
      {
        name: "Ashwin & Aman",
        role: "B2B Headliners · Punjabi & Commercial",
        avatar: PORTRAITS[7],
      },
    ],
    tiers: [
      {
        id: "tier-free",
        name: "Early Bird Couple Guestlist",
        price: 0,
        description: "Free couple entry before 8:30 PM with digital ShowSalsa QR pass.",
        perks: ["Couple Entry Before 8:30 PM", "Instant QR Confirmation"],
        availableCount: 15,
        badge: "FREE ONWARDS",
      },
      {
        id: "tier-eb",
        name: "General Stag / Cover Pass",
        price: 999,
        description: "Includes full cover voucher redeemable at the rooftop bar.",
        perks: ["Full ₹999 Bar Cover", "Rooftop Arena Access"],
        availableCount: 40,
      },
      {
        id: "tier-vip",
        name: "VIP Fanpit Console Access",
        price: 2499,
        description: "Elevated console-side zone with premium pours and table seating.",
        perks: ["Console-Side Access", "₹2,000 F&B Cover", "Skip-the-Line Entry"],
        availableCount: 12,
      },
    ],
    mapCoordinates: { lat: 21.0921, lng: 79.0451, area: "Wagdara Ring Road, Nagpur" },
  },
  {
    id: "evt-halloween-thane",
    title: "Halloween Party — Dark People, Brighter Nights",
    subtitle: "Immersive Gothic Warehouse Rave · Costumes, Masks & Madness",
    category: "Nightlife",
    city: "Mumbai",
    venue: "The Foundry Warehouse, Thane West",
    address: "Wagle Estate Industrial Zone, Thane, Mumbai MMR 400604",
    dateLabel: "24 Oct",
    timeLabel: "12:00 PM",
    dateFilterBucket: "Today",
    startingPrice: 599,
    image: PHOTOS.halloweenThane,
    poster: ["#7f1d1d", "#0c0a09", "#000000"],
    posterTagline: "24.10.2026 · TRICK OR PARTY",
    isNewlyAdded: true,
    isTrending: true,
    ageLimit: "21+ Only",
    duration: "6 Hours",
    language: "Dark Techno, Hardgroove & Hip-Hop",
    description:
      "Same night, different reality. Enter a transformed gothic industrial warehouse featuring SFX makeup artists at the door, blood-orange smoke chambers, and ₹50,000 cash prizes for the best costume.",
    dateSlots: ["Sat, 24 Oct", "Sat, 31 Oct"],
    timeSlots: ["12:00 PM Day Rave", "09:00 PM Midnight Ritual"],
    lineup: [
      {
        name: "Kollision & Raven",
        role: "Dark Techno & Industrial Selectors",
        avatar: PORTRAITS[8],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird General (Phase 1)",
        price: 599,
        description: "Entry ticket including complimentary spooky welcome shooter and face-paint station.",
        perks: ["Arena Entry", "1 Welcome Shooter", "SFX Face Paint Booth Access"],
        availableCount: 55,
      },
      {
        id: "tier-vip",
        name: "VIP Coven Pit (With Cover)",
        price: 1999,
        description: "Includes ₹1,500 F&B cover + VIP gothic lounge seating.",
        perks: ["₹1,500 Redeemable Cover", "VIP Gothic Lounge", "Fast-Track Entry"],
        availableCount: 22,
        badge: "POPULAR",
      },
      {
        id: "tier-backstage",
        name: "Backstage Crypt Sanctuary",
        price: 4999,
        description: "All-inclusive backstage bar access and private masquerade booth.",
        perks: ["Backstage Sanctuary Access", "Unlimited Craft Cocktails", "Private Security"],
        availableCount: 8,
      },
    ],
    mapCoordinates: { lat: 19.2183, lng: 72.9781, area: "Thane West, Mumbai MMR" },
  },
  {
    id: "evt-throttle-expo-2026",
    title: "Automotive Fest — Throttle Expo 2026",
    subtitle: "Supercars · Performance Cars · Superbikes · Drift Exhibitions & Music",
    category: "Festivals",
    city: "Nagpur",
    venue: "Ambazari Expo Grounds",
    address: "South Ambazari Road, Ambazari, Nagpur 440010",
    dateLabel: "24 Oct",
    timeLabel: "03:00 PM",
    dateFilterBucket: "Today",
    startingPrice: 249,
    image: PHOTOS.autoFest,
    poster: ["#1e293b", "#083344", "#09090b"],
    posterTagline: "REVLINE X THROTTLE CLUB",
    isNewlyAdded: true,
    ageLimit: "All Ages Welcome",
    duration: "3 Hours (3:00 PM – 6:00 PM)",
    language: "English & Hindi",
    description:
      "Presented by Revline x Throttle Club. Witness over 65+ exotic supercars, tuned JDM icons, litre-class superbikes, live exhaust decibel battles, stunt riding cages, and sunset hip-hop showcases.",
    dateSlots: ["Sat, 24 Oct", "Sun, 25 Oct"],
    timeSlots: ["03:00 PM Paddock Gates", "04:30 PM Drift & Exhaust Battle"],
    lineup: [
      {
        name: "Throttle Club Supercar Collective",
        role: "Lamborghini, Porsche GT3 & BMW M Division Lineup",
        avatar: PORTRAITS[9],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "General Paddock Pass",
        price: 249,
        description: "Full access to the exhibition arena, stunt zone bleachers, and food court.",
        perks: ["Exhibition Arena Access", "Live Stunt Show Viewing", "Merchandise Stalls"],
        availableCount: 120,
      },
      {
        id: "tier-vip",
        name: "VIP Pit Lane & Supercar Grid Walk",
        price: 999,
        description: "Step inside the roped supercar paddock for close-up photography and driver meetups.",
        perks: ["Inner Supercar Grid Walk", "Official Lanyard & Badge", "Priority Gate Entry"],
        availableCount: 35,
        badge: "ENTHUSIAST PICK",
      },
      {
        id: "tier-backstage",
        name: "Drift Taxi Co-Passenger Experience",
        price: 2999,
        description: "Includes VIP Pit Lane access plus 2 hot laps inside a pro-spec drift car!",
        perks: ["2 Hot Laps in Pro Drift Car", "Safety Helmet & Briefing", "GoPro Footage Included"],
        availableCount: 6,
        badge: "ADRENALINE",
      },
    ],
    mapCoordinates: { lat: 21.1232, lng: 79.0515, area: "Ambazari, Nagpur" },
  },
  {
    id: "evt-filmy-pune",
    title: "FILMY. — All Drama. No Scripts.",
    subtitle: "Bollywood’s Biggest Anthems · One Dance Floor · Featuring DJ Reva",
    category: "Music & Gigs",
    city: "Pune",
    venue: "Marquee — The Art Cafe & Lounge",
    address: "Koregaon Park Annexe, Mundhwa Road, Pune 411036",
    dateLabel: "24 Oct",
    timeLabel: "08:00 PM",
    dateFilterBucket: "Today",
    startingPrice: 1500,
    image: PHOTOS.filmyPune,
    poster: ["#4c0519", "#1c1917", "#000000"],
    posterTagline: "FEATURING DJ REVA · NO SKIPPING CLASSICS",
    isNewlyAdded: true,
    isTrending: true,
    ageLimit: "21+ Only",
    duration: "5 Hours",
    language: "Bollywood Retro & Modern Hits",
    description:
      "Presented by Marquee Nights. A shamelessly dramatic night dedicated to pure 2000s and 2010s Bollywood bangers, theatrical confetti drops, and signature filmy cocktails.",
    dateSlots: ["Sat, 24 Oct"],
    timeSlots: ["08:00 PM Doors Open", "10:00 PM DJ Reva Headline Set"],
    lineup: [
      {
        name: "DJ Reva",
        role: "Headliner · Pure Bollywood Edit Set",
        avatar: PORTRAITS[10],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird General (Full Cover)",
        price: 1500,
        description: "Entry for 1 with ₹1,500 redeemable on artisanal tapas and cocktails.",
        perks: ["100% Redeemable F&B Cover", "Dancefloor Access"],
        availableCount: 38,
      },
      {
        id: "tier-vip",
        name: "VIP Filmy Gallery Pass",
        price: 2999,
        description: "Mezzanine level gallery access overlooking the stage with dedicated server.",
        perks: ["Mezzanine Gallery View", "₹2,500 Redeemable Cover", "Complimentary Filmy Shots"],
        availableCount: 15,
      },
      {
        id: "tier-backstage",
        name: "Star Cast VVIP Lounge (For 4)",
        price: 9999,
        description: "Private velvet sofa booth for 4 guests with premium bottle service.",
        perks: ["Private Booth for 4 Guests", "1 Premium Bottle Included", "Valet Parking"],
        availableCount: 3,
      },
    ],
    mapCoordinates: { lat: 18.5362, lng: 73.894, area: "Koregaon Park, Pune" },
  },
  {
    id: "evt-aditya-rao-del",
    title: "Aditya Rao — Lanterns Symphony Tour",
    subtitle: "Intimate Candlelit Amphitheatre Concert with 12-Piece String Ensemble",
    category: "Music & Gigs",
    city: "Delhi NCR",
    venue: "Heritage Garden Amphitheatre",
    address: "Nizamuddin, New Delhi 110013",
    dateLabel: "30 Oct",
    timeLabel: "07:00 PM",
    dateFilterBucket: "This Week",
    startingPrice: 1799,
    image: PHOTOS.lanternsDelhi,
    poster: ["#1e1b4b", "#0f172a", "#09090b"],
    posterTagline: "CANDLELIT HERITAGE AMPHITHEATRE",
    isCuratedExclusive: true,
    isTrending: true,
    ageLimit: "16+ Permitted",
    duration: "3 Hours",
    language: "Hindi & English Indie Folk",
    description:
      "An unforgettable autumn evening under the stars at a 16th-century heritage garden amphitheatre. Aditya Rao performs his most beloved catalog rearranged for grand piano and a 12-piece string orchestra.",
    dateSlots: ["Fri, 30 Oct", "Sat, 31 Oct"],
    timeSlots: ["06:00 PM Heritage Walk & Doors", "07:15 PM Symphony Set"],
    lineup: [
      {
        name: "Aditya Rao",
        role: "Singer-Songwriter · Acoustic & Piano",
        avatar: PORTRAITS[3],
      },
      {
        name: "The Delhi Chamber Strings",
        role: "12-Piece Live String Ensemble",
        avatar: PORTRAITS[11],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird Amphitheatre Steps",
        price: 1799,
        description: "Cushioned heritage stone step seating with panoramic view of the illuminated stage.",
        perks: ["Cushioned Step Seating", "Artisanal Mulled Wine & Coffee Bar Access"],
        availableCount: 44,
      },
      {
        id: "tier-vip",
        name: "VIP Moonlit Lawn Loungers",
        price: 3499,
        description: "Front-tier plush lounge chairs directly facing the grand piano.",
        perks: ["Front Lawn Lounger", "Complimentary Artisanal Grazing Box", "Priority Gate Entry"],
        availableCount: 16,
        badge: "CURATED PICK",
      },
      {
        id: "tier-backstage",
        name: "Patron Circle + Soundcheck Experience",
        price: 6499,
        description: "Exclusive pre-show intimate 20-minute acoustic soundcheck + signed vinyl LP.",
        perks: ["Private Soundcheck Access (5 PM)", "Signed Lanterns Vinyl LP", "Row 1 Seating"],
        availableCount: 5,
        badge: "RARE EXPERIENCE",
      },
    ],
    mapCoordinates: { lat: 28.5955, lng: 77.2466, area: "Nizamuddin Heritage Park, New Delhi" },
  },
  {
    id: "evt-phulkari-pune",
    title: "PHULKARI NIGHTS PUNE — Royal Diwali Fest",
    subtitle: "Saffron Grand Dining & Nightlife · Grand Punjabi Cultural Night",
    category: "Festivals",
    city: "Pune",
    venue: "Saffron Grand Dining, Sangamvadi",
    address: "Sangamvadi, Pune 411001",
    dateLabel: "24 Oct",
    timeLabel: "08:00 PM",
    dateFilterBucket: "Today",
    startingPrice: 1299,
    image: PHOTOS.phulkariPune,
    poster: ["#701a75", "#3b0764", "#09090b"],
    posterTagline: "SAFFRON PUNE · ROYAL PUNJABI NIGHT",
    isNewlyAdded: true,
    ageLimit: "21+ Only",
    duration: "5 Hours",
    language: "Punjabi Folk, Bhangra & Commercial",
    description:
      "The royal festive spirit of Patiala arrives at Saffron Pune! Dress in your finest ethnic couture for live dhol ensembles, couture cocktail bars, and non-stop Punjabi wedding-style anthems.",
    dateSlots: ["Sat, 24 Oct"],
    timeSlots: ["08:00 PM Grand Entry"],
    lineup: [
      {
        name: "DJ Kabir & Live Dhol Tasha",
        role: "Bhangra & Urban Desi Showcase",
        avatar: PORTRAITS[4],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird General Pass",
        price: 1299,
        description: "Includes entry and ₹1,000 F&B cover.",
        perks: ["₹1,000 Redeemable Cover", "Live Dhol Arena Access"],
        availableCount: 45,
      },
      {
        id: "tier-vip",
        name: "Maharaja VIP Deck",
        price: 2999,
        description: "Elevated royal deck seating with butler service and ₹2,500 cover.",
        perks: ["VIP Deck Seating", "₹2,500 Full Cover", "Valet Parking"],
        availableCount: 10,
      },
    ],
    mapCoordinates: { lat: 18.5314, lng: 73.8685, area: "Sangamvadi, Pune" },
  },
  {
    id: "evt-mixology-mum",
    title: "Savour & Spirit: Agave & Craft Cocktail Masterclass",
    subtitle: "Hosted by an Award-Winning Head Mixologist with 5-Course Tapas Pairing",
    category: "Workshops",
    city: "Mumbai",
    venue: "The Copper Still Conservatory",
    address: "Kamala Mills Compound, Lower Parel, Mumbai 400013",
    dateLabel: "01 Nov",
    timeLabel: "04:00 PM",
    dateFilterBucket: "This Month",
    startingPrice: 2200,
    image: PHOTOS.mixologyMumbai,
    poster: ["#022c22", "#042f2e", "#09090b"],
    posterTagline: "KAMALA MILLS · LIMITED TO 24 SEATS",
    isCuratedExclusive: true,
    ageLimit: "21+ Strictly",
    duration: "2.5 Hours",
    language: "English",
    description:
      "An intimate hands-on sensory workshop exploring rare smoky mezcals, clarified milk punches, and botanical infusions. Craft 4 signature cocktails at your personal copper station paired with regional Indian small plates.",
    dateSlots: ["Sun, 01 Nov", "Sun, 08 Nov"],
    timeSlots: ["04:00 PM Afternoon Session"],
    lineup: [
      {
        name: "Meera Sen & Kunal Dsouza",
        role: "Beverage Director & Culinary Lead",
        avatar: PORTRAITS[1],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Individual Mixology Station Pass",
        price: 2200,
        description: "Includes personal bar kit, 4 full-sized craft cocktails, and 5-course tasting menu.",
        perks: ["4 Craft Cocktails", "5-Course Tapas Pairing", "Recipe Booklet to Take Home"],
        availableCount: 12,
        badge: "INTIMATE BATCH",
      },
      {
        id: "tier-vip",
        name: "Connoisseur Couple Pass + Take-Home Bitters",
        price: 4199,
        description: "Station for 2 guests plus a bespoke house-aged aromatic bitters bottle.",
        perks: ["Entry for 2 Guests", "House-Aged Bitters Bottle", "Front Row Bar Seating"],
        availableCount: 6,
      },
    ],
    mapCoordinates: { lat: 19.0022, lng: 72.8286, area: "Kamala Mills, Lower Parel, Mumbai" },
  },
  {
    id: "evt-moonlit-flea-hyd",
    title: "The Moonlit Flea — Artisanal Food, Vinyl & Indie Fest",
    subtitle: "120+ Homegrown Brands · Craft Breweries · Vinyl Listening Bar & Indie Bands",
    category: "Flea Markets",
    city: "Hyderabad",
    venue: "Madhapur Open Air Grounds",
    address: "Izzathnagar, HITEC City, Hyderabad 500084",
    dateLabel: "07 Nov",
    timeLabel: "03:00 PM",
    dateFilterBucket: "This Month",
    startingPrice: 399,
    image: PHOTOS.moonlitFlea,
    poster: ["#2e1065", "#4a044e", "#09090b"],
    posterTagline: "120+ POP-UPS · CRAFT BEER GARDEN",
    isCuratedExclusive: true,
    isTrending: true,
    ageLimit: "All Ages (Pet Friendly)",
    duration: "8 Hours (3:00 PM – 11:00 PM)",
    language: "English, Telugu & Hindi",
    description:
      "Hyderabad’s happiest bohemian weekend returns! Discover 120+ curated indie fashion & ceramic studios, wood-fired artisanal kitchens, an analog vinyl listening tent, pottery wheels, and live sunset indie bands.",
    dateSlots: ["Sat, 07 Nov", "Sun, 08 Nov"],
    timeSlots: ["03:00 PM All-Day Festival Pass"],
    lineup: [
      {
        name: "The Monsoon Lanes",
        role: "Sunday Sunset Headliner · Indie Folk",
        avatar: PORTRAITS[2],
      },
      {
        name: "The Vinyl Collective",
        role: "All-Day Analog Listening Lounge",
        avatar: PORTRAITS[3],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Single Day Festival Pass",
        price: 399,
        description: "Full access to shopping pop-ups, live music stage, and open-air cinema.",
        perks: ["Full Festival Access", "Live Indie Concert Included", "Pet-Friendly Zones"],
        availableCount: 200,
      },
      {
        id: "tier-vip",
        name: "Weekend Super Pass + Craft Beer Flight",
        price: 999,
        description: "2-Day festival access plus a 4-glass craft brewery tasting flight.",
        perks: ["Valid Both Saturday & Sunday", "4-Pint Craft Beer Tasting Flight", "Festival Tote Bag"],
        availableCount: 45,
        badge: "BEST VALUE",
      },
    ],
    mapCoordinates: { lat: 17.4704, lng: 78.376, area: "HITEC City, Madhapur, Hyderabad" },
  },
  {
    id: "evt-bollywood-tap-house",
    title: "Bollywood Night — Tap House Junction",
    subtitle: "Quizzes · Musical Bingo · Drinking Games & Retro Anthems",
    category: "Music & Gigs",
    city: "Nagpur",
    venue: "Tap House Junction, Laxmi Nagar",
    address: "RPTS Road, Laxmi Nagar Square, Nagpur 440022",
    dateLabel: "24 Oct",
    timeLabel: "08:00 PM",
    dateFilterBucket: "Today",
    startingPrice: 499,
    image: PHOTOS.tidalGoa,
    poster: ["#042f2e", "#022c22", "#09090b"],
    posterTagline: "QUIZZES · BINGO · BOLLYWOOD CLASSICS",
    isNewlyAdded: true,
    ageLimit: "21+ Only",
    duration: "4 Hours",
    language: "Hindi & Bollywood",
    description:
      "An interactive Bollywood trivia, musical bingo, and retro dancefloor night at Tap House Junction. Win complimentary craft pitchers for your table and sing along to iconic 90s and 2000s hits.",
    dateSlots: ["Sat, 24 Oct"],
    timeSlots: ["08:00 PM Trivia & DJ Night"],
    lineup: [
      {
        name: "DJ Rooh & Host Kabir",
        role: "Bollywood Vinyl & Interactive Trivia",
        avatar: PORTRAITS[1],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird General (With Cover)",
        price: 499,
        description: "Includes entry + ₹499 redeemable on craft beers and appetizers.",
        perks: ["Full ₹499 F&B Cover", "Bollywood Bingo Card Included"],
        availableCount: 60,
      },
      {
        id: "tier-vip",
        name: "VIP Brewery Table (For 4)",
        price: 2499,
        description: "Reserved front table for 4 with 1 craft beer tower included.",
        perks: ["Table for 4 Guests", "3L Craft Beer Tower Included"],
        availableCount: 8,
      },
    ],
    mapCoordinates: { lat: 21.1245, lng: 79.0642, area: "Laxmi Nagar, Nagpur" },
  },
  {
    id: "evt-saturday-socials",
    title: "Saturday Socials — Feat. Tara",
    subtitle: "High-Energy Commercial & Afro-Tech Showcase with the Ember Residents",
    category: "Nightlife",
    city: "Pune",
    venue: "Ember Sky Lounge",
    address: "Baner Balewadi High Street, Pune 411045",
    dateLabel: "24 Oct",
    timeLabel: "08:00 PM",
    dateFilterBucket: "Today",
    startingPrice: 999,
    image: PHOTOS.saturdaySocials,
    poster: ["#0f172a", "#18181b", "#000000"],
    posterTagline: "SATURDAY SOCIALS · FEAT. TARA",
    isNewlyAdded: true,
    ageLimit: "21+ Only",
    duration: "5 Hours",
    language: "Afro House, Tech & Commercial",
    description:
      "Headline selector Tara takes control of the Saturday Socials console with a high-voltage Afro-house and peak-time commercial set, supported by the Ember residents.",
    dateSlots: ["Sat, 24 Oct"],
    timeSlots: ["08:00 PM Doors Open"],
    lineup: [
      {
        name: "DJ Tara",
        role: "Headliner · Afro-Tech & Commercial",
        avatar: PORTRAITS[2],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird General Pass",
        price: 999,
        description: "General entry with ₹500 cover coupon included.",
        perks: ["Arena Access", "₹500 Cover Coupon"],
        availableCount: 40,
      },
      {
        id: "tier-vip",
        name: "VIP Fanpit Console Deck",
        price: 2499,
        description: "Stage-side VIP deck access with ₹2,000 full cover.",
        perks: ["VIP Console Deck", "₹2,000 Full Cover"],
        availableCount: 15,
      },
    ],
    mapCoordinates: { lat: 18.5636, lng: 73.7768, area: "Balewadi High Street, Pune" },
  },
  {
    id: "evt-vanta-koi-goa",
    title: "VANTA x KOI Live at Tidal",
    subtitle: "International Electronic Duo Direct from Thailand · Exclusive India Debut",
    category: "Music & Gigs",
    city: "Goa",
    venue: "Tidal Cliff Arena, Vagator",
    address: "Small Vagator Cliff, Ozran, North Goa 403509",
    dateLabel: "24 Oct",
    timeLabel: "10:00 PM",
    dateFilterBucket: "Today",
    startingPrice: 1999,
    image: PHOTOS.auroraMumbai,
    poster: ["#78350f", "#1c1917", "#000000"],
    posterTagline: "INTERNATIONAL ACT · VANTA X KOI",
    isNewlyAdded: true,
    ageLimit: "21+ Only",
    duration: "6 Hours",
    language: "Big Room Techno & Hard Dance",
    description:
      "Get ready for an international electronic takeover! Direct from Bangkok’s biggest festival stages, VANTA x KOI bring their high-energy big-room techno and synth-rave production to Goa.",
    dateSlots: ["Sat, 24 Oct"],
    timeSlots: ["10:00 PM International Showcase"],
    lineup: [
      {
        name: "VANTA x KOI (Thailand)",
        role: "International Headliners · Peak-Time Techno",
        avatar: PORTRAITS[1],
      },
    ],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird General Pass",
        price: 1999,
        description: "Main floor entry with full visual stage view.",
        perks: ["Main Arena Entry", "RFID Cashless Band"],
        availableCount: 50,
      },
      {
        id: "tier-vip",
        name: "VIP Fanpit Pass",
        price: 3499,
        description: "Elevated VIP deck with ₹2,000 F&B cover.",
        perks: ["VIP Elevated Deck", "₹2,000 Redeemable Cover"],
        availableCount: 20,
      },
      {
        id: "tier-backstage",
        name: "Backstage Artist Table",
        price: 6999,
        description: "Backstage access right behind the DJ booth.",
        perks: ["Backstage Booth Access", "Premium Bottle Service Credit"],
        availableCount: 5,
      },
    ],
    mapCoordinates: { lat: 15.596, lng: 73.7364, area: "Vagator, North Goa" },
  },
];


export interface FilterCriteria {
  city: CityName;
  category: EventCategory;
  dateFilter: DateFilter;
  searchQuery: string;
}

/** Filters events by city, category, date bucket and search text (title, subtitle, venue, city, category, lineup). */
export function filterEvents(events: EventItem[], criteria: FilterCriteria): EventItem[] {
  const query = criteria.searchQuery.trim().toLowerCase();
  return events.filter((event) => {
    const matchesCity = criteria.city === "All Cities" || event.city.toLowerCase() === criteria.city.toLowerCase();
    const matchesCategory = criteria.category === "All" || event.category === criteria.category;
    const matchesDate = criteria.dateFilter === "Any" || event.dateFilterBucket === criteria.dateFilter;
    const matchesSearch =
      query.length === 0 ||
      event.title.toLowerCase().includes(query) ||
      event.subtitle.toLowerCase().includes(query) ||
      event.venue.toLowerCase().includes(query) ||
      event.city.toLowerCase().includes(query) ||
      event.category.toLowerCase().includes(query) ||
      event.lineup.some((artist) => artist.name.toLowerCase().includes(query));
    return matchesCity && matchesCategory && matchesDate && matchesSearch;
  });
}

/** Subtotal, the 5% booking fee, 18% GST on that fee, promo discount and the grand total for the chosen tiers. */
export function calculateCartTotals(tiers: TicketTier[], quantities: Record<string, number>, promoCode?: string): CartCalculation {
  let subtotal = 0;
  let totalTickets = 0;
  for (const tier of tiers) {
    const qty = Math.max(0, Math.floor(quantities[tier.id] || 0));
    if (qty > 0) {
      subtotal += tier.price * qty;
      totalTickets += qty;
    }
  }
  if (totalTickets === 0) {
    return { subtotal: 0, bookingFee: 0, gstAmount: 0, discountAmount: 0, grandTotal: 0, totalTickets: 0 };
  }

  const promo = (promoCode || "").trim().toUpperCase();
  let discountAmount = 0;
  if (promo === "SALSA10" && subtotal > 0) {
    discountAmount = Math.round(subtotal * 0.1);
  } else if (promo === "VIP500" && subtotal >= 2500) {
    discountAmount = 500;
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const bookingFee = discountedSubtotal > 0 ? Math.round(discountedSubtotal * 0.05) : 0;
  const gstAmount = bookingFee > 0 ? Math.round(bookingFee * 0.18) : 0;
  return { subtotal, bookingFee, gstAmount, discountAmount, grandTotal: discountedSubtotal + bookingFee + gstAmount, totalTickets };
}

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** ₹2,499, or "Free"; with `includeOnwards`, "₹2,499 Onwards" or "Free Onwards". */
export function formatINR(amount: number, includeOnwards = false): string {
  if (amount <= 0) return includeOnwards ? "Free Onwards" : "Free";
  const formatted = INR.format(amount);
  return includeOnwards ? `${formatted} Onwards` : formatted;
}

/** The organiser payout calculator: ShowSalsa keeps 2.5% and pays the rest within 48 hours. */
export function estimateOrganizerPayout(avgTicketPrice: number, expectedAttendees: number) {
  const grossRevenue = Math.max(0, avgTicketPrice) * Math.max(0, Math.floor(expectedAttendees));
  const platformCommission = Math.round(grossRevenue * 0.025);
  return { grossRevenue, platformCommission, netPayout48Hr: grossRevenue - platformCommission, payoutHours: 48 };
}

/** A 10-digit Indian mobile number, with or without +91 / 0 and spaces. */
export function isIndianMobile(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits);
}

export function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface Attendee {
  name: string;
  email: string;
  phone: string;
}

/** The first problem with a checkout, or undefined when it can go through. Same order as the export: tickets, then details. */
export function checkoutError(totalTickets: number, attendee: Attendee): string | undefined {
  if (totalTickets === 0) return "Please select at least 1 ticket tier to proceed.";
  if (!attendee.name.trim() || !attendee.email.trim() || !attendee.phone.trim()) {
    return "Please enter your name, email, and WhatsApp phone number for QR ticket delivery.";
  }
  if (!isEmail(attendee.email)) return "Please enter a valid email address for your M-Ticket.";
  if (!isIndianMobile(attendee.phone)) return "Please enter a 10-digit Indian WhatsApp number.";
  return undefined;
}

/** What an organiser types into the "List Your Event" form. */
export interface EventListing {
  title: string;
  subtitle: string;
  city: Exclude<CityName, "All Cities">;
  category: Exclude<EventCategory, "All">;
  venue: string;
  dateLabel: string;
  timeLabel: string;
  startingPrice: string;
  artistName: string;
}

export function listingError(listing: EventListing): string | undefined {
  if (!listing.title.trim() || !listing.venue.trim() || !listing.artistName.trim()) {
    return "Please enter Event Title, Venue Name, and Headliner Artist.";
  }
  return undefined;
}

function listingPrice(listing: EventListing) {
  return Math.max(0, Number(listing.startingPrice) || 999);
}

/** The WhatsApp message an organiser sends to list their event. */
export function listingMessage(listing: EventListing) {
  const lines = [
    `Hi ${site.name}, I want to list an event.`,
    `Event: ${listing.title.trim()}`,
    `Headliner / host: ${listing.artistName.trim()}`,
    `Category: ${listing.category}`,
    `City: ${listing.city}`,
    `Venue: ${listing.venue.trim()}`,
    `Date: ${listing.dateLabel.trim() || "31 Oct"}, ${listing.timeLabel.trim() || "09:00 PM"}`,
    `Early bird price: ${formatINR(listingPrice(listing))}`,
  ];
  if (listing.subtitle.trim()) lines.push(`Tagline: ${listing.subtitle.trim()}`);
  return lines.join("\n");
}

/** The listing as an event on the page, as the export built it: three tiers priced from the early bird. */
export function listingToEvent(listing: EventListing, id: string): EventItem {
  const title = listing.title.trim();
  const venue = listing.venue.trim();
  const artist = listing.artistName.trim();
  const { city, category } = listing;
  const price = listingPrice(listing);
  const dateLabel = listing.dateLabel.trim() || "31 Oct";
  const timeLabel = listing.timeLabel.trim() || "09:00 PM";
  return {
    id,
    title,
    subtitle: listing.subtitle.trim() || `Exclusive ${category} showcase featuring ${artist}`,
    category,
    city,
    venue,
    address: `${venue}, Central District, ${city}`,
    dateLabel,
    timeLabel,
    dateFilterBucket: "This Week",
    startingPrice: price,
    image: PHOTOS.bornToShine,
    poster: ["#4c0519", "#3b0764", "#09090b"],
    posterTagline: `${city.toUpperCase()} · FEAT. ${artist.toUpperCase()}`,
    isNewlyAdded: true,
    isTrending: true,
    ageLimit: "21+ Only",
    duration: "4 Hours",
    language: "English & Hindi",
    description: `Live curated experience at ${venue}, ${city} headlined by ${artist}. Instant QR gate entry powered by ${site.name}.`,
    dateSlots: [`Sat, ${dateLabel}`],
    timeSlots: [`${timeLabel} Main Entry`],
    lineup: [{ name: artist, role: `Headliner · ${category}`, avatar: PORTRAITS[1] }],
    tiers: [
      {
        id: "tier-eb",
        name: "Early Bird General",
        price,
        description: "Standard arena entry with instant QR pass.",
        perks: ["General Arena Access", "Express QR Verification"],
        availableCount: 100,
      },
      {
        id: "tier-vip",
        name: "VIP Fanpit",
        price: price + 1500,
        description: "Elevated front-of-stage zone with dedicated bar lane.",
        perks: ["Front Stage Fanpit", "₹1,000 Redeemable Cover", "VIP Bar Access"],
        availableCount: 30,
        badge: "VIP",
      },
      {
        id: "tier-backstage",
        name: "Backstage Lounge",
        price: price + 3500,
        description: "All-access backstage hospitality lounge & meet-and-greet.",
        perks: ["Backstage Lounge", "Artist Hospitality Deck", "Valet Parking"],
        availableCount: 10,
        badge: "EXCLUSIVE",
      },
    ],
    mapCoordinates: { lat: 19.076, lng: 72.8777, area: `Downtown ${city}` },
  };
}

/** A pass number such as SS-482913. Called from the checkout handler only, never while rendering. */
export function newBookingId() {
  return `SS-${Math.floor(100000 + Math.random() * 900000)}`;
}

/** The time a pass was booked, such as "08:15 pm". Called from the checkout handler only. */
export function timeNowLabel() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/** The pass already in "My Passes" when the page opens, so the wallet is never empty in a demo. */
export const SAMPLE_BOOKING: BookingRecord = {
  bookingId: "SS-849201",
  eventId: "evt-kairav-goa",
  eventTitle: "DJ Kairav Live at Tidal Goa",
  venue: "Tidal Club, Vagator",
  city: "Goa",
  dateSlot: "Sat, 24 Oct",
  timeSlot: "10:00 PM Headliner Set",
  items: [{ tierName: "VIP Fanpit & Elevated Deck", quantity: 2, unitPrice: 3999 }],
  totalPaid: 8470,
  bookedAt: "08:15 PM",
  attendeeName: "Aarav Sharma",
  attendeeEmail: "aarav.sharma@example.com",
  attendeePhone: WHATSAPP_DISPLAY,
};
