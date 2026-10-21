/**
 * Lotus Women's Clinic is a made-up clinic for the website demo. Every name, number,
 * address, review and price here is fictional. Never use a real client's details.
 */
export const clinic = {
  name: "Lotus Women's Clinic",
  shortName: "Lotus",
  tagline: "Expert care for women at every stage of life",
  city: "Visakhapatnam",
  phone: "+91 73821 30063",
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
    degree: "MBBS, MS (Obstetrics & Gynecology)",
    role: "Consultant Obstetrician & Gynecologist",
    years: 12,
    /** The hero line under the tagline. */
    positioning:
      "A trusted gynecologist and obstetrician in Visakhapatnam, with more than 12 years of experience in pregnancy care, fertility and women's health.",
    intro: "Consultant obstetrician and gynecologist in Visakhapatnam, with more than 12 years of clinical experience.",
    bio: [
      "Dr. Ananya Rao is a consultant obstetrician and gynecologist who has cared for women in Visakhapatnam for more than 12 years.",
      "She trained in Andhra Pradesh and served as a consultant at a large city maternity hospital for eight years before founding Lotus Women's Clinic in 2022.",
      "Her practice is built on evidence-based treatment, clear explanations and a written care plan for every patient.",
      "Dr. Rao sees patients at the clinic six days a week and offers online consultations on Sundays.",
    ],
    milestones: [
      { year: "2010", text: "MBBS" },
      { year: "2014", text: "MS, Obstetrics & Gynecology" },
      { year: "2014 – 2022", text: "Consultant at a city maternity hospital" },
      { year: "2022", text: "Founded Lotus Women's Clinic" },
    ],
    /** About's qualifications list. The hospital is made up. */
    qualifications: [
      { label: "MBBS", text: "Bachelor of Medicine and Bachelor of Surgery, 2010" },
      { label: "MS", text: "Master of Surgery in Obstetrics & Gynecology, 2014" },
      { label: "FOGSI", text: "Member, Federation of Obstetric and Gynaecological Societies of India" },
      { label: "Affiliation", text: "Visiting consultant, Harbourside Maternity Hospital, Visakhapatnam" },
      { label: "Languages", text: "English, Telugu and Hindi" },
    ],
    languages: "English, Telugu and Hindi",
  },
  stats: [
    { value: "12+", label: "Years of Experience" },
    { value: "8,000+", label: "Patients Treated" },
    { value: "3,000+", label: "Successful Deliveries" },
    { value: "4.9", label: "Google Rating", reviews: "312 reviews" },
  ],
  services: [
    {
      slug: "pregnancy-care",
      icon: "baby",
      name: "Obstetrics & Pregnancy Care",
      short:
        "Dr. Rao provides complete care from the first positive test through delivery and recovery. Each trimester follows a planned schedule of visits, scans and tests.",
      details: ["Visit and scan plan for each trimester", "Nutrition and exercise guidance", "Normal and caesarean delivery", "Postnatal care and follow-up"],
    },
    {
      slug: "gynecology",
      icon: "stethoscope",
      name: "Gynecology Consultations",
      short:
        "The clinic treats irregular or painful periods, infections, pelvic pain and other common concerns. Routine screening, including Pap smears and breast examinations, is also available.",
      details: ["Irregular or painful periods", "Vaginal discharge and infections", "Pelvic pain", "Pap smear and breast examination"],
    },
    {
      slug: "fertility",
      icon: "heart-pulse",
      name: "Fertility & IVF Guidance",
      short:
        "Couples trying to conceive receive a structured evaluation of both partners. Dr. Rao explains every option and refers to trusted IVF centres when treatment is needed.",
      details: ["Evaluation of both partners", "Ovulation tracking", "Lifestyle guidance", "IVF referral when needed"],
    },
    {
      slug: "pcos",
      icon: "activity",
      name: "PCOS & Hormonal Health",
      short:
        "PCOS and hormonal conditions are managed with long-term plans for cycles, weight, skin and fertility. Regular follow-ups track progress and adjust treatment.",
      details: ["Diagnosis and blood tests", "Diet and activity plan", "Medication when needed", "Regular follow-ups"],
    },
    {
      slug: "menopause",
      icon: "sun",
      name: "Menopause Care",
      short:
        "Women going through menopause receive relief for hot flushes, sleep problems and mood changes. Care also includes screening for bone and heart health.",
      details: ["Symptom review", "Bone and heart health screening", "Treatment options explained", "Ongoing follow-up plan"],
    },
    {
      slug: "online",
      icon: "video",
      name: "Online Consultations",
      short:
        "Patients can consult Dr. Rao by video or phone from home. Online visits suit follow-ups, report reviews and second opinions.",
      details: ["Video or phone consultation", "Payment by UPI before the call", "Prescription on WhatsApp", "Sundays and evenings"],
    },
  ],
  why: [
    { title: "Evidence-Based Treatment", text: "Every recommendation follows current clinical guidelines for obstetrics and gynecology." },
    { title: "Personalised Care Plans", text: "Each patient receives a written plan built around her health, history and goals." },
    { title: "Advanced Diagnostics on Site", text: "Ultrasound and routine tests are done at the clinic, so results arrive sooner." },
    { title: "Timely Follow-Ups on WhatsApp", text: "Reminders for visits, scans and medicines arrive on WhatsApp, with replies within two hours." },
  ],
  testimonials: [
    {
      quote:
        "I was anxious throughout my first pregnancy. Dr. Rao explained every scan and every step in detail. My delivery went smoothly, and the care after it was just as thorough.",
      name: "Sravani K.",
      area: "Visakhapatnam",
    },
    {
      quote:
        "I had irregular periods for several years and had seen three doctors before. Dr. Rao diagnosed PCOS and gave me a clear plan. Within six months my cycles were regular again.",
      name: "Divya R.",
      area: "Visakhapatnam",
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

/** The four services the home page shows. The services page lists them all. */
export const homeServiceSlugs = ["pregnancy-care", "gynecology", "fertility", "pcos"] as const;

/** The clinic number as a direct WhatsApp chat link: wa.me wants the digits only, country code first. */
export const clinicWhatsAppHref = `https://wa.me/${clinic.phone.replace(/\D/g, "")}`;

/** The line icon each service card shows. Names match lucide-react icons, mapped in ServiceIcon.tsx. */
export type ServiceIconName = (typeof clinic.services)[number]["icon"];

export type VisitTypeId = (typeof clinic.booking.visitTypes)[number]["id"];
