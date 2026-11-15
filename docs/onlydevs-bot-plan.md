# Ogi, the onlydevs bot: plan (draft, 15 Nov 2026)

The bot is named **Ogi** (decided 15 Nov 2026). Mascot: `public/brand/ogi.svg`.

One assistant, built once, that any business switches on with its own details.
It has two modes on the same engine:

- **Customer mode**: answers customers, books, manages their booking, hands over to staff.
- **Owner mode**: answers the owner's questions about the business and sends insights.

Status: plan only. Nothing is built.

## 1. How a business plugs in

Every business is set up with four things. None of them need code.

| Layer | What it holds | How it is filled |
|---|---|---|
| Profile | Name, hours, address, phone, tone, languages, owner phone numbers | A setup form |
| Knowledge | FAQs, menu or services with prices, policies | Paste the website link, upload a PDF, or type entries |
| Skills | Which actions the bot may take | Switches in the console |
| Channels | Website chat bubble, WhatsApp number | One script line for the website; WhatsApp number linked once |

**Knowledge is plain data.** When the owner edits a price or an FAQ in the console, or a row changes in the table, the bot uses the new value on the next message. Nobody retrains anything.

## 1a. Where the bot lives: one bubble, a different profile per page

| Page | Bot profile | Mode | Does |
|---|---|---|---|
| onlydevs demo hub | onlydevs demo guide | Customer | Explains each demo and service, points to the right one |
| Lotus clinic site | Lotus Women's Clinic | Customer | Answers patients, books visits, manages their booking |
| Lotus clinic admin (logged in) | Lotus Women's Clinic | Owner | Questions on bookings, patients, sources, no-shows |
| Verdant Crest site | Verdant Crest | Customer | Projects, prices, site visits, brochure, leads |
| Solstice cafe, ShowSalsa, Kalyani CRM | That business | Customer on the site, owner when logged in | Same pattern |
| onlydevs company website (later) | onlydevs | Customer | For now: information about the company, services and demos only |

- Each page tells the bot which profile it belongs to.
- Owner mode switches on only when the server sees a valid admin login for that business. A page can never turn it on by itself, so a visitor cannot get business numbers from the public bot.
- The company website, its database, booking a call and its integrations come later as their own project; the bot profile gains those skills then.

## 2. Customer mode

| Skill | Clinic | Cafe | Real estate | Ticketing | Tiles |
|---|---|---|---|---|---|
| Answer questions from the knowledge | Yes | Yes | Yes | Yes | Yes |
| Book | Visits | Table reservations | Site visits | Tickets | Showroom visits |
| Manage own booking (view, change, cancel) | Yes | Yes | Yes | Yes | Yes |
| Take orders | | Yes | | | |
| Capture a lead | | | Yes | | Yes |
| Send a document | | Menu | Brochure, floor plans | Ticket | Quote |
| Hand over to staff | Yes | Yes | Yes | Yes | Yes |

Each skill calls a system that exists already: clinic bookings, the tiles CRM, the cafe order flow, and so on. The bot never writes to the database directly.

Rules for every business:

- The bot answers only from that business's knowledge. It politely declines anything off-topic. This keeps it inside Meta's rule that bots on WhatsApp must serve one business.
- It never invents a price, a time or a promise. If it is not sure, it hands over to staff.
- Industry rules sit on top. Clinic: no medical advice, no reading of symptoms, emergencies get "Call 108 or go to the nearest emergency room" plus the clinic phone.

## 3. Owner mode

The owner asks on WhatsApp from a registered owner number, or in the console chat.

Examples:

| Business | Questions |
|---|---|
| Clinic | Patients this month, no-show rate, new vs returning, bookings by source, busiest day and slot |
| Cafe | Sales this month, top items this week, average order value, peak hours, week-on-week change |
| Real estate | Leads this week, site visits booked vs done, conversion by source |
| Ticketing | Tickets sold per event, revenue by event, promo code use |
| Tiles | Quotes sent, quotes closed, quoted vs sold value, top products, follow-ups pending |

Each answer is one or two sentences, a small chart in the console when useful, and the basis, for example "Based on 214 bookings from 1 to 15 Nov".

It also speaks up on its own:

- A Monday morning summary on WhatsApp, compared with last week.
- Alerts when something changes, for example "No-shows doubled this week".
- One suggestion a week, drawn from the numbers.

### How owner answers read the data: the metrics catalogue

The bot does not write its own database queries. It reads through a **catalogue of measures**. Each measure is a short definition:

```
name:        no_show_rate
label:       No-show rate
industry:    clinic
table:       bookings
calculation: count(status = 'no_show') / count(status in ('visited','no_show'))
date field:  date
filters:     clinic_slug, date range, source
owner only:  no
```

The bot picks measures and combines them: "no-show rate this month by source". The catalogue lives in the database, so a new measure needs no deploy.

Why a catalogue and not free queries:

- The numbers are tested once and stay right.
- The bot can only read what the catalogue exposes, so patient details, phone numbers and other businesses' data stay out of reach.
- Every answer can show exactly which measure it used.

### Adding new fields later (pricing, revenue and more)

When the business starts recording something new, two small steps make the bot know it:

1. Add the column to the table and start filling it, for example `fee` on clinic bookings.
2. Add one catalogue entry, for example `revenue = sum(fee) where status = 'visited'`.

From then on, "What was revenue this month?" works. Fields planned for later:

| Industry | Field | Measures it unlocks |
|---|---|---|
| Clinic | Fee per visit, payment status | Revenue, average fee, unpaid visits |
| Clinic | Doctor per visit | Visits and revenue per doctor |
| Cafe | Stored orders with items and totals | Sales, top items, average order value, peak hours |
| Cafe | Item cost | Margin per item |
| Real estate | Unit price, booking amount | Pipeline value, bookings value |
| Ticketing | Refunds, fees | Net revenue |
| Tiles | Cost price | Margin per quote and per product |
| All | Ad spend per source | Cost per booking or lead by source |

Until a field exists, the bot says plainly that it does not record that yet, instead of guessing.

## 4. Architecture

- **One engine** on Vercel: a route per channel (website chat, WhatsApp inbound) feeds the same conversation handler.
- **Model with tool calling** through the connector in section 5. Skills and catalogue measures are tools. The engine runs the tool calls against our own APIs and returns the results. Tool definitions are sorted the same way every time so prompt caching works where the provider offers it.
- **Prompt caching.** Each business's profile, knowledge and tool list form a stable prefix that is cached; only the conversation changes per message. This is the main cost saver.
- **Data (new tables)**: `bots` (business, profile, enabled skills, channels, owner numbers), `bot_knowledge` (entries and sources), `bot_conversations` and `bot_messages` (with handover state), `metrics` (the catalogue).
- **WhatsApp**: the existing inbound webhook routes a message to the business that owns the receiving number; owner numbers go to owner mode.
- **Website**: one script tag adds the chat bubble on any site.
- **Console**: setup, test chat, inbox for handed-over chats, weekly report including questions the bot could not answer.

## 5. Model and cost

- **Demos: Google Gemini Flash on the free tier** (Google AI Studio key, no card). Decided by Abhinav, 15 Nov 2026.
- **One model connector.** The engine talks to the model through a single small module, so Gemini, Groq, Claude or any paid model is a settings change: `BOT_MODEL_PROVIDER` and `BOT_MODEL` env vars plus the provider's key.
- **Real clients go to a paid tier before launch.** Google's free tier may use requests to improve its products and has small, unpublished daily limits. No real customer or patient chats on a free tier.
- **Backup for demo days:** Groq free tier (open models, about 1,000 requests a day reported), test tool calling on the chosen model first.
- Keep each business's profile, knowledge and tool list as a stable prefix, so providers with prompt caching reuse it.
- WhatsApp replies inside a chat the customer started are free up to 1,000 a month per number, then charged by Meta.

## 6. Safety and policy

- Meta allows business-specific bots for questions, bookings and support; general-purpose AI assistants are banned on WhatsApp since 15 Jan 2026. The bot stays business-only.
- Owner mode answers only to registered owner numbers or a logged-in owner account. Staff accounts see sales only if the owner allows it.
- Owner mode is read-only. Actions (moving visits, sending messages) keep the confirm-first flow.
- No phone numbers or message text in logs.
- Customers can always type "talk to staff" or STOP.

## 7. Demo plan

- Every industry in the hub gets an "AI assistant" service with a live bot that knows that demo business: Lotus, Solstice, Verdant Crest, ShowSalsa, Kalyani.
- Owner mode works on the demo data, so questions like "no-show rate this month" answer on stage.
- One "Set up your bot" page shows a new business going live in a few minutes.

## 8. Phases

1. **Version 1**: engine, customer mode (questions, book, manage own booking, hand over) for the clinic and cafe demos, owner mode with the catalogue for clinic, website bubble, Monday summary.
2. **Version 2**: WhatsApp channel for the bot, all five industries, console setup and inbox, alerts and weekly suggestion.
3. **Version 3**: new fields (fees, stored orders, costs, ad spend), Telugu and Hindi tuning, Instagram messages.

## 9. Open questions

1. Which paid model each real client moves to at launch (paid Gemini Flash, or another), decided per client.
2. Pricing to clients: setup fee plus monthly, and whether owner mode is a higher tier.
3. Which demo business goes first in version 1: clinic only, or clinic and cafe together?
