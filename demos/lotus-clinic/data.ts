/**
 * Lotus Women's Clinic is a made-up clinic for the website demo. Every name, number,
 * address, review and price here is fictional. Never use a real client's details.
 */
export const clinic = {
  name: "Lotus Women's Clinic",
  shortName: "Lotus",
  tagline: "Women's health, obstetrics and gynecology",
  city: "Visakhapatnam",
  phone: "+91 98765 43210",
  email: "care@lotusclinic.in",
  address: ["Door 9-12-4, 2nd floor", "Beach Road, Siripuram", "Visakhapatnam 530003"],
  /** What Google Maps searches for. A real junction, so the pin lands in the right part of the city. */
  mapQuery: "Siripuram Junction, Visakhapatnam",
  hours: [
    { days: "Monday to Saturday", time: "10:00 am – 7:00 pm" },
    { days: "Sunday", time: "Online consultations only" },
  ],
  doctor: {
    name: "Dr. Ananya Rao",
    initials: "AR",
    degree: "MBBS, MS (Obstetrics and Gynecology)",
    role: "Consultant obstetrician and gynecologist",
    years: 12,
    intro:
      "Dr. Ananya Rao has cared for women in Visakhapatnam for over 12 years. She looks after pregnancy, periods, fertility and menopause, and she takes time to explain every choice.",
    bio: [
      "Dr. Rao completed her MBBS and her MS in Obstetrics and Gynecology in Andhra Pradesh. She then worked for eight years in a large maternity hospital before she opened Lotus Women's Clinic.",
      "She believes a good visit starts with listening. Each patient gets enough time to ask questions, and a clear plan to take home.",
      "She sees patients at the clinic six days a week, and online on Sundays.",
    ],
    milestones: [
      { year: "2010", text: "MBBS" },
      { year: "2014", text: "MS, Obstetrics and Gynecology" },
      { year: "2014 – 2022", text: "Consultant at a city maternity hospital" },
      { year: "2022", text: "Opened Lotus Women's Clinic" },
    ],
    languages: "English, Telugu and Hindi",
  },
  stats: [
    { value: "12+", label: "years of experience" },
    { value: "8,000+", label: "women cared for" },
    { value: "4.9", label: "Google rating, 312 reviews" },
  ],
  services: [
    {
      slug: "pregnancy-care",
      name: "Pregnancy care",
      short: "Care from the first test to delivery, with every visit and scan planned.",
      details: ["Visit and scan plan for each month", "Diet and exercise advice", "Normal and caesarean delivery", "Care after delivery"],
    },
    {
      slug: "gynecology",
      name: "Gynecology check-ups",
      short: "Period problems, infections, pain and routine check-ups.",
      details: ["Irregular or painful periods", "White discharge and infections", "Pelvic pain", "Pap smear and breast check"],
    },
    {
      slug: "fertility",
      name: "Fertility advice",
      short: "Clear tests and a step-by-step plan for couples trying to conceive.",
      details: ["Tests for both partners", "Ovulation tracking", "Lifestyle advice", "Referral for IVF when needed"],
    },
    {
      slug: "pcos",
      name: "PCOS care",
      short: "Long-term care for PCOS: periods, weight, skin and fertility.",
      details: ["Diagnosis and blood tests", "Diet and activity plan", "Medicine when needed", "Regular follow-ups"],
    },
    {
      slug: "menopause",
      name: "Menopause care",
      short: "Relief for hot flushes, sleep and mood changes, and bone health.",
      details: ["Symptom review", "Bone and heart health checks", "Treatment options explained", "Follow-up plan"],
    },
    {
      slug: "online",
      name: "Online consultation",
      short: "See Dr. Rao by video or phone, from home. Good for follow-ups.",
      details: ["Video or phone call", "Pay by UPI before the call", "Prescription on WhatsApp", "Sundays and evenings"],
    },
  ],
  why: [
    { title: "Time to listen", text: "Visits are not rushed. You can ask every question." },
    { title: "Clear plans", text: "You leave with a written plan and know the next step." },
    { title: "Reminders on WhatsApp", text: "Visit, scan and medicine reminders come to your phone." },
    { title: "Private and respectful", text: "A women-only clinic with a female doctor and staff." },
  ],
  testimonials: [
    {
      quote: "Dr. Rao explained every step of my pregnancy. I never felt scared or rushed.",
      name: "Sravani K.",
      area: "MVP Colony",
    },
    {
      quote: "After years of irregular periods, I finally have a plan that works. The reminders help me stay on track.",
      name: "Divya R.",
      area: "Gajuwaka",
    },
    {
      quote: "The online consultation saved me a long trip. The prescription came on WhatsApp right after the call.",
      name: "Haritha M.",
      area: "Anakapalle",
    },
  ],
  booking: {
    visitTypes: [
      { id: "clinic", label: "Clinic visit", description: "Meet Dr. Rao at the clinic in Siripuram." },
      { id: "online", label: "Online consultation", description: "Video or phone call from home. ₹500." },
    ],
    slots: ["Morning, 10 am – 1 pm", "Afternoon, 2 pm – 5 pm", "Evening, 5 pm – 7 pm"],
    reasons: [
      "Pregnancy care",
      "Period problems",
      "Fertility advice",
      "PCOS",
      "Menopause",
      "Routine check-up",
      "Something else",
    ],
  },
} as const;

/** The clinic number as a direct WhatsApp chat link: wa.me wants the digits only, country code first. */
export const clinicWhatsAppHref = `https://wa.me/${clinic.phone.replace(/\D/g, "")}`;

export type VisitTypeId = (typeof clinic.booking.visitTypes)[number]["id"];
