/**
 * THE SKY49: the Real estate → Website live demo.
 * Rebuilt from the Astro site Abhinav supplied (24 Oct 2026): src/data/site.ts, src/data/faq.ts and the section copy.
 * Every real contact in the original is replaced by the onlydevs demo contacts below.
 */

/** The onlydevs demo WhatsApp and phone number. Every wa.me and tel: link on the Sky49 demo is built from these. */
export const WHATSAPP_NUMBER = "917382130063";
export const PHONE_DISPLAY = "+91 73821 30063";
export const PHONE_TEL = "+917382130063";
/** The onlydevs demo email. Every mailto: link on the Sky49 demo uses it. */
export const EMAIL = "hello@onlydevs.in";

/** A wa.me chat with the demo number, with the message typed in when there is one. */
export function whatsAppHref(text?: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const telHref = `tel:${PHONE_TEL}`;
export const mailHref = `mailto:${EMAIL}`;

export const site = {
  name: "Sky49",
  fullName: "The SKY 49 by Ananda Prosper",
  /** Page title on /real-estate/website. */
  title: "THE SKY49",
  /** From the supplied metadata.json. */
  description: "Ultra-premium aesthetic light-theme real estate experience with editorial luxury storytelling.",
  builder: "Ananda Prosper",
  address: {
    streetAddress: "Osman Nagar, Tellapur",
    addressLocality: "Hyderabad",
    addressRegion: "Telangana",
    postalCode: "502032",
  },
  rera: "Telangana RERA — verify registration ID on the official portal",
  mapEmbedSrc:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.3196016508928!2d78.27522347594073!3d17.44441060115836!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcbed17e91b4b4b%3A0x19787397a2d26a29!2sThe%20SKY%2049%20by%20Ananda%20Prosper!5e0!3m2!1sen!2sin!4v1775729985100!5m2!1sen!2sin",
  youtubeWalkthroughId: "I5DbiUkT05M",
} as const;

const IMG = "/demos/sky49";

export const images = {
  hero: { src: `${IMG}/hero-towers.jpg`, alt: "Sky49 Tellapur ultra-luxury 3 and 4 BHK apartment towers in Hyderabad" },
  about: { src: `${IMG}/about-architecture.jpg`, alt: "Sky49 lifestyle architecture view" },
  highlights: { src: `${IMG}/hero-towers.jpg`, alt: "Sky49 highlights visual" },
  walkthroughPoster: { src: `${IMG}/walkthrough-poster.jpg`, alt: "Sky49 towers above the morning mist" },
  sitePlan: { src: `${IMG}/site-plan.jpg`, alt: "Sky49 site plan layout", width: 1024, height: 724 },
  faq: { src: `${IMG}/amenities-1.jpg`, alt: "Sky49 tower elevation" },
} as const;

/** In-page links in the header and the mobile menu. */
export const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#highlights", label: "Highlights" },
  { href: "#floor-plans", label: "Floor Plans" },
  { href: "#amenities", label: "Amenities" },
  { href: "#location", label: "Location" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
] as const;

export type NavLink = (typeof NAV_LINKS)[number];

export const stats = [
  { label: "Floors", value: "G+49" },
  { label: "Towers", value: "4" },
  { label: "Amenities", value: "1 lakh+ sq ft" },
  { label: "Compliance", value: "RERA approved" },
] as const;

export const aboutFacts = [
  { label: "Configuration", value: "3 & 4 BHK ultra-luxury homes" },
  { label: "Scale", value: "G+49 towers with skyline presence" },
  { label: "Amenities", value: "1 lakh+ sq ft lifestyle spaces" },
  { label: "Address", value: "Osman Nagar, Tellapur" },
] as const;

export const highlights = [
  {
    title: "Skyline identity",
    body: "A vertical G+49 narrative across four towers creates a recognizable Sky49 Hyderabad silhouette—important for luxury buyers who value landmark presence and long-term address prestige in Tellapur.",
  },
  {
    title: "Amenity depth",
    body: "With over 1 lakh sq ft of amenities (indicative), Sky49 is designed as a daily-use club, not a checklist—wellness, social, and family zones scale for real weekend traffic, not brochure filler.",
  },
  {
    title: "Osman Nagar fit",
    body: "Osman Nagar’s growth story pairs greenfield calm with improving infrastructure—ideal for CXOs who want quieter evenings yet refuse to compromise on commute logic to Financial District and ORR.",
  },
  {
    title: "3 & 4 BHK focus",
    body: "Large-format 3 BHK and 4 BHK layouts prioritize light, storage, and staff movement—supporting multi-generational living and work-from-home suites without awkward retrofits later.",
  },
] as const;

export const currentSiteUpdateImages = [1, 2, 3, 4, 5, 6].map((n) => ({
  src: `${IMG}/site-update-${n}.jpg`,
  alt: `Sky49 construction update image ${n}`,
}));

export const floorPlanRows = [
  { label: "01/", name: "Master Plan", image: `${IMG}/master-plan.jpg` },
  { label: "02/", name: "Tower - A Floor Plan", image: `${IMG}/tower-a-floor-plan.jpg` },
  { label: "03/", name: "Tower - B Floor Plan", image: `${IMG}/tower-b-floor-plan.jpg` },
  { label: "04/", name: "Tower - C Floor Plan", image: `${IMG}/tower-c-floor-plan.jpg` },
  { label: "05/", name: "Tower - D Floor Plan", image: `${IMG}/tower-d-floor-plan.jpg` },
] as const;

export const compareRows = [
  {
    title: "Specification honesty",
    sky49:
      "Sky49 publishes visible specifications, GEO tables, and FAQ content so “Sky49 price” and “Sky49 floor plans” questions start from facts—not generic ad copy.",
    typical:
      "Many launches rely on mood boards without comparable tables, making it harder to cite details in AI overviews or personal research notes.",
  },
  {
    title: "Amenity usability",
    sky49: "Large amenity square footage is framed around daily usability—families can imagine weekends without leaving the gates.",
    typical: "Smaller amenity footprints can feel repetitive after move-in when programming does not scale with tower population.",
  },
  {
    title: "West-corridor timing",
    sky49:
      "Tellapur / Osman Nagar benefits from disciplined planning narratives; buyers compare ORR, Neopolis, and airport routes with clear-eyed expectations.",
    typical: "Older micro-markets may trade on nostalgia but can lack comparable growth headroom or modern clubhouse scale.",
  },
] as const;

export const projectGalleryImages = [1, 2, 3, 4, 5, 6].map((n) => ({
  src: `${IMG}/site-update-${n}.jpg`,
  alt: `Sky49 project gallery image ${n}`,
}));

/** Icon paths are the original 24×24 strokes. */
export const specs = [
  { label: "Structure", value: "RCC frame engineered for high-rise performance (indicative)", icon: "M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6" },
  { label: "Facades", value: "Premium glazing & skyline-responsive cladding strategy", icon: "M4 20V4h16v16M9 4v16M15 4v16M4 10h16M4 14h16" },
  { label: "Lobbies", value: "Double-height arrival experience with hospitality-grade finishes", icon: "M4 20h16M6 20V7h12v13M9 7V4h6v3M9 12h6" },
  { label: "Elevators", value: "High-speed passenger lifts across residential zones", icon: "M7 21V4h10v17M10 8l2-2 2 2M10 17l2 2 2-2" },
  {
    label: "Parking",
    value: "Structured parking with EV-ready provisions (subject to plan)",
    icon: "M5 14h14l-1.5-5h-11zM7 14l-1 3M17 14l1 3M8 18h.01M16 18h.01M9 11h4a2 2 0 100-4H9v8",
  },
  { label: "Security", value: "Multi-tier access control and CCTV backbone", icon: "M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" },
  {
    label: "Sustainability",
    value: "Rainwater, energy-conscious services—confirm latest green features",
    icon: "M12 21c4.5-2.5 7-6 7-10V4c-3 0-5 1-7 3-2-2-4-3-7-3v7c0 4 2.5 7.5 7 10z",
  },
] as const;

export const diligenceChecklist = [
  "Verify tower-wise drawings, floor plans, and area statements.",
  "Confirm lift-to-unit ratio and service elevator strategy.",
  "Check parking allocation terms and EV readiness scope.",
  "Validate current RERA disclosures and approval milestones.",
] as const;

export const amenityShots = [
  { src: `${IMG}/amenities-1.jpg`, alt: "Sky49 amenities gallery image 1" },
  { src: `${IMG}/amenities-2.jpg`, alt: "Sky49 amenities gallery image 2" },
  { src: `${IMG}/amenities-3.jpg`, alt: "Sky49 amenities gallery image 3" },
  { src: `${IMG}/amenities-4.jpg`, alt: "Sky49 amenities gallery image 4" },
] as const;

export const proximityRows = [
  { destination: "ORR (Outer Ring Road)", time: "~10–15 min", note: "Seamless city-wide connectivity" },
  { destination: "Neopolis / Kokapet corridor", time: "~12–18 min", note: "Premium office & lifestyle cluster" },
  { destination: "Financial District / Gachibowli", time: "~15–20 min", note: "Major IT & financial hubs" },
  { destination: "Rajiv Gandhi International Airport", time: "~35–45 min", note: "Via ORR depending on traffic" },
] as const;

export type FaqItem = { question: string; answer: string };

export const faqItems: FaqItem[] = [
  {
    question: "What is Sky49 Hyderabad?",
    answer:
      "Sky49 (The SKY 49) is an ultra-luxury residential development in Osman Nagar, Tellapur, Hyderabad, offering premium 3 BHK and 4 BHK apartments across multiple towers with extensive lifestyle amenities. The project is positioned for buyers seeking long-term value in Hyderabad’s west corridor with strong connectivity to IT hubs.",
  },
  {
    question: "Where is Sky49 Tellapur located?",
    answer:
      "Sky49 is located in Tellapur within the Osman Nagar micro-market, part of Hyderabad’s high-demand western growth belt. The location balances quieter residential living with access to ORR, Financial District, Gachibowli, Neopolis/Kokapet, and airport routes depending on traffic conditions.",
  },
  {
    question: "What apartment configurations are available at Sky49?",
    answer:
      "The project is designed around spacious 3 BHK and 4 BHK residences tailored for luxury living, with layouts intended for natural light, privacy, and premium finishes. Exact sizes, floor plans, and availability should be confirmed during a guided site visit or consultation.",
  },
  {
    question: "Is Sky49 RERA approved?",
    answer:
      "The project is marketed as RERA registered. Prospective buyers should verify the latest RERA registration details, approvals, and disclosures on the official Telangana RERA portal and with the sales team before making any booking decision.",
  },
  {
    question: "What amenities are offered at Sky49?",
    answer:
      "Sky49 emphasizes a large amenities footprint—often described as 1 lakh+ square feet across lifestyle, wellness, and community spaces. Typical luxury stacks include club facilities, landscaped decks, fitness zones, and curated indoor-outdoor experiences; final amenity scope should be confirmed from the official brochure.",
  },
  {
    question: "How tall is the Sky49 development?",
    answer:
      "Marketing materials reference a high-rise format with G+49 floors per tower (indicative). Structural heights, floor counts, and unit distribution can evolve during execution; confirm the latest tower-wise specifications with the developer’s official documentation.",
  },
  {
    question: "What is the price range for Sky49 apartments?",
    answer:
      "Pricing for ultra-luxury inventory depends on floor level, tower, facing, and market cycles. For accurate Sky49 Hyderabad price, payment plan, and limited-time offers, request a private consultation or brochure download through the official channel.",
  },
  {
    question: "Can I book a site visit for Sky49 Tellapur?",
    answer:
      "Yes. Site visits are typically scheduled through the sales desk. Use the on-page form to request a complimentary visit, share your preferred time window, and a representative will coordinate entry permissions and route guidance for Tellapur.",
  },
  {
    question: "How does Sky49 compare to other luxury projects in Hyderabad?",
    answer:
      "Buyers often compare Sky49 with other premium Tellapur and west-Hyderabad projects on parameters like tower height, amenity scale, builder track record, unit efficiency, and long-term liquidity. A side-by-side review of floor plans, specifications, and location fit is the best way to decide.",
  },
  {
    question: "Is home loan assistance available for Sky49?",
    answer:
      "Most large luxury projects coordinate with reputed banks and NBFCs for home loan facilitation. Eligibility, interest rates, and disbursal are determined by the lender based on your profile; the sales team can share indicative banking partners and documentation checklists.",
  },
];

/* Forms: checked in the browser, then sent as a WhatsApp message to the demo number. No API, no database. */

/** A 10-digit Indian mobile number, with or without +91, 91 or a leading 0. Spaces and hyphens are ignored. */
export function isIndianMobile(value: string) {
  return /^(?:\+?91|0)?[6-9]\d{9}$/.test(value.replace(/[\s-]/g, ""));
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export type Eoi = { name: string; phone: string };

/** Errors for the hero EOI form, by field. Empty when it is fine. */
export function eoiErrors(e: Eoi): Partial<Record<keyof Eoi, string>> {
  const errors: Partial<Record<keyof Eoi, string>> = {};
  if (!e.name.trim()) errors.name = "Enter your name.";
  if (!e.phone.trim()) errors.phone = "Enter your phone number.";
  else if (!isIndianMobile(e.phone)) errors.phone = "Enter a 10-digit Indian mobile number.";
  return errors;
}

export function eoiMessage(e: Eoi) {
  return ["Hello Sky49! I would like to register an EOI.", `Name: ${e.name.trim()}`, `Phone: ${e.phone.trim()}`].join("\n");
}

export const INTERESTS = [
  { value: "3 BHK luxury", label: "3 BHK luxury" },
  { value: "4 BHK premium", label: "4 BHK premium" },
  { value: "Sky / upper formats", label: "Sky / upper formats" },
] as const;

export type Contact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
  wantsBrochure: boolean;
};

/** Errors for the contact form, by field. Empty when it is fine. */
export function contactErrors(c: Contact): Partial<Record<keyof Contact, string>> {
  const errors: Partial<Record<keyof Contact, string>> = {};
  if (!c.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!c.email.trim()) errors.email = "Enter your email.";
  else if (!isEmail(c.email)) errors.email = "Enter a valid email address.";
  if (!c.phone.trim()) errors.phone = "Enter your phone number.";
  else if (!isIndianMobile(c.phone)) errors.phone = "Enter a 10-digit Indian mobile number.";
  if (!c.interest) errors.interest = "Select a residence type.";
  return errors;
}

export function contactMessage(c: Contact) {
  const name = [c.firstName.trim(), c.lastName.trim()].filter(Boolean).join(" ");
  return [
    "Hello Sky49! I would like to book a site visit.",
    `Name: ${name}`,
    `Email: ${c.email.trim()}`,
    `Phone: ${c.phone.trim()}`,
    `Interested in: ${c.interest}`,
    c.message.trim() ? `Message: ${c.message.trim()}` : "",
    c.wantsBrochure ? "Please send me the digital brochure." : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** The messages the quick-action buttons type in, as the original site had them. */
export const SITE_VISIT_TEXT = "Hi, I want to book a Sky49 Hyderabad site visit.";
export const ENQUIRY_TEXT = "Hello — Sky49 Hyderabad inquiry.";
