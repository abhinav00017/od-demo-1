import type { z } from "zod";
import type { catalogSchema } from "@/lib/schema";

/**
 * Every industry, its services and each service's demo. Pages are generated from this list.
 * Add an industry or a service here; no new page files are needed.
 * Order matters: industry pages show services in this order (see .claude/memory/services_pitch.md).
 * All businesses, people, numbers and prices below are made up.
 */
export const industries: z.input<typeof catalogSchema> = [
  {
    slug: "clinic",
    name: "Clinic",
    plural: "clinics",
    audience: "For doctors and clinics that want more booked visits and fewer no-shows.",
    pitch: "We help clinics get found on Google, fill the calendar and keep patients coming back.",
    icon: "clinic",
    services: [
      {
        slug: "website",
        name: "Website",
        summary: "A fast, mobile-first site with a page for every treatment, built to rank on Google.",
        status: "live",
        demo: "lotus-clinic",
      },
      {
        slug: "google-business-profile",
        name: "Google Business Profile",
        summary: "Show up on Google Maps with photos, hours and a steady flow of fresh reviews.",
        status: "preview",
        preview: {
          intro: "Most patients find a clinic on Google Maps. We make sure they find yours, and trust it.",
          gets: [
            "Profile set up and verified, with services, hours and photos.",
            "A review request on WhatsApp after every visit.",
            "Replies to reviews, drafted for you to approve.",
            "Posts for offers and health camps, so the profile stays fresh.",
            "A monthly report: calls, direction requests and searches.",
          ],
          steps: [
            { title: "Claim and verify", text: "We claim your profile, or create it, and get it verified with Google." },
            { title: "Fill it in", text: "We add your services, timings, photos, booking link and WhatsApp number." },
            { title: "Grow reviews", text: "After each visit the patient gets a short WhatsApp message with your review link." },
          ],
          mock: {
            kind: "maps",
            name: "Lotus Women's Clinic",
            category: "Gynecologist",
            rating: 4.9,
            reviews: 312,
            area: "Siripuram, Visakhapatnam",
            openLine: "Open",
            closesLine: "Closes 7 pm",
            review: {
              author: "Sravani K.",
              text: "Dr. Rao explained every step of my pregnancy care. The reminders on WhatsApp were so helpful.",
              when: "2 weeks ago",
            },
            photos: ["teal", "sand", "rose"],
          },
        },
      },
      {
        slug: "whatsapp-automation",
        name: "WhatsApp automation",
        summary: "Confirmations, reminders and follow-ups go out on their own. Fewer no-shows, less typing.",
        status: "preview",
        preview: {
          intro: "Patients read WhatsApp, not email. Every message they need goes out at the right time, without your staff typing it.",
          gets: [
            "A booking confirmation the moment a visit is booked.",
            "A reminder the day before, with the clinic's map link.",
            "A follow-up message after the visit.",
            "A review request with your Google link.",
            "Auto-replies to common questions: timings, fees and location.",
          ],
          steps: [
            { title: "Connect your number", text: "We set up the WhatsApp Business API on your clinic number." },
            { title: "Write the messages", text: "We write each message with you, in English and Telugu if you want." },
            { title: "It runs every day", text: "Each booking triggers the right message at the right time. You see every chat." },
          ],
          mock: {
            kind: "chat",
            contact: "Lotus Women's Clinic",
            status: "Business account",
            messages: [
              {
                from: "business",
                label: "On booking",
                text: "Hi Priya, your visit with Dr. Ananya Rao is booked for Tue 22 Oct at 11:00 am.",
                time: "6:12 pm",
                buttons: ["Confirm", "Change time"],
              },
              { from: "customer", text: "Confirm", time: "6:14 pm" },
              {
                from: "business",
                label: "Day before",
                text: "Reminder: your visit is tomorrow at 11:00 am. Please bring your old reports. Tap below for directions.",
                time: "10:00 am",
                buttons: ["Directions"],
              },
              {
                from: "business",
                label: "After the visit",
                text: "Thank you for visiting today, Priya. If we helped, a short Google review helps other women find us.",
                time: "4:30 pm",
                buttons: ["Leave a review"],
              },
            ],
          },
        },
      },
      {
        slug: "online-consultations",
        name: "Online consultations",
        summary: "Patients book a video or phone slot and pay before the call. You see more people.",
        status: "preview",
        preview: {
          intro: "Follow-ups and first questions do not always need a clinic visit. Patients pick a slot, pay, and join from their phone.",
          gets: [
            "Video or phone consultations, from any phone.",
            "Slot booking that follows your clinic timings.",
            "Payment by UPI or card before the call.",
            "A WhatsApp link to join, sent 10 minutes before.",
            "Notes and prescription sent after the call.",
          ],
          steps: [
            { title: "Set your slots", text: "You choose the days and times for online consultations, and the fee." },
            { title: "Patient books and pays", text: "The patient picks a slot on your website and pays by UPI." },
            { title: "Join the call", text: "Both of you get a join link on WhatsApp. One tap to start." },
          ],
          mock: {
            kind: "video",
            doctor: "Dr. Ananya Rao",
            patient: "Meena",
            fee: "₹500",
            day: "Wed 23 Oct",
            chosen: "6:30 pm",
            slots: [
              { time: "5:00 pm", taken: true },
              { time: "5:30 pm" },
              { time: "6:00 pm", taken: true },
              { time: "6:30 pm" },
              { time: "7:00 pm" },
              { time: "7:30 pm", taken: true },
            ],
          },
        },
      },
      {
        slug: "offers-and-packages",
        name: "Offers and packages",
        summary: "Clear packages that bring new patients in and bring regular patients back.",
        status: "preview",
        preview: {
          intro: "A clear price builds trust. Packages turn one visit into a full course of care.",
          gets: [
            "A free first online consultation for new patients.",
            "A pregnancy care package with every visit and scan planned.",
            "An annual wellness check, with a reminder each year.",
            "Offer banners on your website and Google profile.",
          ],
          steps: [
            { title: "Pick the offers", text: "We agree the packages and prices with you. You stay in control." },
            { title: "Show them everywhere", text: "Offers go on your website, Google profile and WhatsApp replies." },
            { title: "Track what works", text: "You see how many people booked from each offer every month." },
          ],
          mock: {
            kind: "offers",
            heading: "Packages at Lotus Women's Clinic",
            items: [
              { title: "First online consultation", price: "Free", note: "For new patients. 15 minutes by video.", tag: "New patients" },
              { title: "Pregnancy care package", price: "₹14,999", note: "All visits from month 3 to delivery, with a scan plan.", tag: "Most chosen" },
              { title: "Annual wellness check", price: "₹2,499", note: "Pap smear, breast exam, blood tests and a review." },
            ],
          },
        },
      },
      {
        slug: "patient-records",
        name: "Patient records",
        summary: "Prescriptions, reports and visit history in one place, shared with the patient's consent.",
        status: "preview",
        preview: {
          intro: "No more lost reports. Each patient's history is ready before they sit down, and they can see it too.",
          gets: [
            "Visit history, prescriptions and reports in one place.",
            "Reports sent to the patient on WhatsApp.",
            "Consent asked and recorded before any record is stored.",
            "Access only for you and the staff you choose.",
          ],
          steps: [
            { title: "Patient agrees", text: "The patient gives consent on WhatsApp before we store anything." },
            { title: "Add each visit", text: "Staff add the prescription and reports after each visit, in under a minute." },
            { title: "Both can see it", text: "You see the full history. The patient gets their own copy on WhatsApp." },
          ],
          mock: {
            kind: "records",
            patient: "Lakshmi P.",
            meta: "32 yrs · Patient since 2024",
            visits: [
              { date: "14 Oct 2026", title: "Pregnancy review, week 24", files: ["Prescription", "Scan report"] },
              { date: "16 Sep 2026", title: "Pregnancy review, week 20", files: ["Prescription", "Blood tests"] },
              { date: "12 Aug 2026", title: "First pregnancy visit", files: ["Prescription"] },
            ],
          },
        },
      },
    ],
  },
  {
    slug: "cafe",
    name: "Cafe",
    plural: "cafes",
    audience: "For cafes and small restaurants that want more walk-ins, orders and regulars.",
    pitch: "We help cafes get found nearby, take orders on WhatsApp and turn first visits into regulars.",
    icon: "cafe",
    services: [
      {
        slug: "website",
        name: "Website",
        summary: "A menu-first site that loads fast on phones and turns searches into walk-ins and orders.",
        status: "live",
        demo: "solstice-cafe",
      },
      {
        slug: "google-business-profile",
        name: "Google Business Profile",
        summary: "Show up first when people search 'cafe near me', with photos, menu and reviews.",
        status: "preview",
        preview: {
          intro: "Most first visits start with a search on Google Maps. We make your cafe the one people pick.",
          gets: [
            "Profile set up and verified, with menu, hours and photos.",
            "A review request on WhatsApp after each order.",
            "Weekly posts for specials and events.",
            "Replies to reviews, drafted for you to approve.",
          ],
          steps: [
            { title: "Claim and verify", text: "We claim your profile, or create it, and get it verified with Google." },
            { title: "Make it look good", text: "We add photos, the menu, hours, and your WhatsApp order link." },
            { title: "Keep it fresh", text: "Posts each week and new reviews keep you near the top." },
          ],
          mock: {
            kind: "maps",
            name: "Bean Street Cafe",
            category: "Cafe",
            rating: 4.7,
            reviews: 486,
            area: "Beach Road, Visakhapatnam",
            openLine: "Open",
            closesLine: "Closes 11 pm",
            review: { author: "Rahul M.", text: "Best cold brew in Vizag. Ordered on WhatsApp and it was ready when I walked in.", when: "1 week ago" },
            photos: ["espresso", "crema", "clay"],
          },
        },
      },
      {
        slug: "whatsapp-ordering",
        name: "WhatsApp ordering",
        summary: "Customers order on WhatsApp. You get a clean order ticket, not a long chat.",
        status: "preview",
        preview: {
          intro: "Your customers already use WhatsApp. Let them order there, and let the kitchen get a clear ticket.",
          gets: [
            "Menu and ordering inside WhatsApp, with buttons.",
            "Takeaway and table orders.",
            "Payment by UPI link before the order is made.",
            "A ready message when the order is done.",
          ],
          steps: [
            { title: "Connect your number", text: "We set up the WhatsApp Business API on the cafe's number." },
            { title: "Load the menu", text: "We add your menu and prices. You change them any time." },
            { title: "Take orders", text: "Orders come in as tickets. Customers get a message when it is ready." },
          ],
          mock: {
            kind: "chat",
            contact: "Bean Street Cafe",
            status: "Business account",
            messages: [
              { from: "customer", text: "Hi, I want to order for takeaway", time: "8:41 am" },
              {
                from: "business",
                text: "Good morning! Here is today's menu. Tap an item to add it.",
                time: "8:41 am",
                buttons: ["See menu"],
              },
              { from: "customer", text: "1 Cold brew, 1 Masala omelette", time: "8:42 am" },
              {
                from: "business",
                label: "Order #214",
                text: "1 × Cold brew ₹180\n1 × Masala omelette ₹150\nTotal ₹330. Pay by UPI to confirm.",
                time: "8:42 am",
                buttons: ["Pay ₹330"],
              },
              { from: "business", label: "Ready", text: "Your order #214 is ready at the counter. Enjoy!", time: "8:55 am" },
            ],
          },
        },
      },
      {
        slug: "digital-menu-qr",
        name: "Digital menu with QR",
        summary: "Guests scan the table QR and see today's menu with photos. You update it in a minute.",
        status: "preview",
        preview: {
          intro: "No more reprinting menus. Change a price or mark an item sold out, and every table sees it.",
          gets: [
            "A QR code for every table, printed and ready.",
            "Menu with photos, prices and veg or non-veg marks.",
            "Sold-out items hidden in one tap.",
            "Call the waiter or order from the table.",
          ],
          steps: [
            { title: "We build the menu", text: "We turn your printed menu into a clean phone menu." },
            { title: "Print the QR", text: "We give you table stands with a QR code for each table." },
            { title: "Update any time", text: "Change prices and items from your phone. Guests see it at once." },
          ],
          mock: {
            kind: "qr-menu",
            name: "Bean Street Cafe",
            table: "Table 6",
            sections: [
              {
                title: "Coffee",
                items: [
                  { name: "Filter coffee", price: "₹60" },
                  { name: "Cappuccino", price: "₹160" },
                  { name: "Cold brew", price: "₹180", note: "Best seller" },
                ],
              },
              {
                title: "All-day breakfast",
                items: [
                  { name: "Masala omelette", price: "₹150" },
                  { name: "Avocado toast", price: "₹240" },
                ],
              },
            ],
          },
        },
      },
      {
        slug: "offers-and-loyalty",
        name: "Offers and loyalty",
        summary: "A digital stamp card and simple offers that bring regulars back more often.",
        status: "preview",
        preview: {
          intro: "A regular is worth more than a one-time visitor. A stamp card on WhatsApp keeps them coming back.",
          gets: [
            "A digital stamp card on WhatsApp. No app, no paper.",
            "A free drink after every 8 orders, or a reward you choose.",
            "Birthday offers sent on the day.",
            "Happy-hour offers sent to regulars when the cafe is quiet.",
          ],
          steps: [
            { title: "Choose the reward", text: "You choose the reward and how many visits it takes." },
            { title: "Stamp each order", text: "Each order adds a stamp. The customer sees the card on WhatsApp." },
            { title: "Bring them back", text: "Offers go out on slow days and birthdays, on their own." },
          ],
          mock: {
            kind: "loyalty",
            name: "Bean Street Cafe",
            customer: "Anjali",
            stamps: 6,
            goal: 8,
            reward: "Free coffee of your choice",
            offers: [
              { title: "20% off cold brew, 3 to 5 pm", when: "Today" },
              { title: "Free dessert on your birthday", when: "12 Nov" },
            ],
          },
        },
      },
      {
        slug: "daily-sales-summary",
        name: "Daily sales summary",
        summary: "One WhatsApp message each night: sales, orders and best sellers for the day.",
        status: "preview",
        preview: {
          intro: "Know how the day went without opening a laptop. The numbers come to you at closing time.",
          gets: [
            "Total sales and orders, sent each night at closing.",
            "A comparison with the same day last week.",
            "Busy hours, so you can plan staff.",
            "Best sellers and items that did not sell.",
          ],
          steps: [
            { title: "Connect your billing", text: "We connect your billing app or the WhatsApp orders." },
            { title: "Pick the time", text: "You choose when the message comes and who gets it." },
            { title: "Read it in a minute", text: "One short message each night. A full report each month." },
          ],
          mock: {
            kind: "summary",
            name: "Bean Street Cafe",
            date: "Sat 19 Oct",
            total: "₹48,250",
            change: "+12% vs last Saturday",
            orders: 214,
            average: "₹225",
            hours: [
              { label: "8a", value: 34 },
              { label: "10a", value: 52 },
              { label: "12p", value: 41 },
              { label: "2p", value: 18 },
              { label: "4p", value: 26 },
              { label: "6p", value: 58 },
              { label: "8p", value: 47 },
              { label: "10p", value: 22 },
            ],
            top: [
              { name: "Cold brew", count: 62 },
              { name: "Masala omelette", count: 38 },
              { name: "Cappuccino", count: 35 },
            ],
          },
        },
      },
    ],
  },
];
