# Decisions

Append only. Newest at the bottom.

## 2026-10-20

- Repo created at `~/passion-projects/od-demo-1/`. GitHub: abhinav00017/od-demo-1. Empty at start.
- Purpose: onlydevs sales demo hub. Flow: landing "select a client type" → industry page with its services → each service opens a demo.
- Industries on day one: Clinic, Cafe. More later.
- Day one build: hub, two industry pages, Clinic "website" demo as a full demo clinic site. Every other service opens a clean coming-soon demo page so no click looks broken. Real demos get built one at a time after.
- The demo clinic is made up. Never Dr. Gowthami. Name, doctor, photos all fictional.
- Style: minimal, simple, straight. Neutral palette until brand guidelines arrive.
- Stack: same as onlydevs_prod_1 so code can move between them later. Next.js App Router, TypeScript, Tailwind v4, Vitest. Static, no database.
- Brand guidelines received 20 Oct 2026: logo supplied, colours sampled, see brand.md. Hub uses purple #6F32D6, dark #14272F, grey #757E82, light background #F2F7F8.
- Demo clinic name: Lotus Women's Clinic, Dr. Ananya Rao. Fictional. Abhinav approved.

## 2026-10-20 (hub build)

- Scaffold: create-next-app ran in a temp folder; files moved in. Next.js 16.4.2 (Turbopack), React 19.3, Tailwind v4 via `@tailwindcss/turbopack` (no PostCSS file), Zod 4, Vitest 5, lucide-react. Same versions as onlydevs_prod_1.
- `next.config.ts` pins `turbopack.root`. Without it the build warned that it used a package-lock.json in the home folder.
- Cache Components and Partial Prefetching stay on. The root layout sets `ensureStatic = "navigation"`. All 19 real routes build as full static HTML (read from `.next/server/app/*.meta`). Only the three fallback shells for unknown params are partial.
- Dynamic routes read `params` only inside a Suspense child, as in onlydevs_prod_1.
- Unknown URLs: `next start` answers 404 (measured on /nope, /clinic/nope, /clinic/website/nope). `next dev` answers 200 with the 404 page in the body (measured).
- Routes: `app/[industry]`, `app/[industry]/[service]`, `app/[industry]/[service]/[page]`. A live service renders its demo home at /<industry>/<service>. Its inner pages (/clinic/website/about and so on) come from the `[page]` segment. No hand-written `app/clinic/` folder.
- Content lives in `content/industries.ts`. `lib/schema.ts` (Zod) checks it at import, through `lib/catalog.ts`. Duplicate slugs and unknown demo ids fail the build and the tests.
- A preview page's mock-up is data too: one of nine kinds (chat, maps, video, offers, records, browser, qr-menu, loyalty, summary) in `components/mocks/`.
- Live demos are listed in `lib/demos.ts` with their pages. `demos/render.tsx` maps a demo id to its components. Lotus Women's Clinic is in `demos/lotus-clinic/`.
- Cafe services, in order: Website, Google Business Profile, WhatsApp ordering, Digital menu with QR, Offers and loyalty, Daily sales summary. All are "Preview". The fictional cafe in the mock-ups is Bean Street Cafe, Beach Road, Visakhapatnam.
- Only Clinic > Website is "Live demo". The other 11 services are "Preview" pages.
- Brand grey #757E82 measures 4.15:1 on white, under AA for body text. It is used only for the 24px tagline (large text, 3:1). Body text uses #5E676B (5.8:1 on white). Below 640px the tagline is 18px, so it uses #5E676B there too.
- `tests/contrast.test.ts` reads the colour tokens from `app/globals.css` and checks 55 text/background pairs against AA.
- Logo: the wordmark was cut from `logo-source.png` into `public/brand/onlydevs-wordmark.png` (1256x440, transparent). Each pixel was unmixed against the background into pure #6F32D6 or #14272F with alpha. It is a PNG, not an SVG.
- Lotus palette: deep teal #0E5E5A, dark teal #0A4542, sand #F3E8D8, cream #FBF7F0, rose #B5485D for small accents. Lotus headings use Fraunces, a serif, so the demo reads as a different business. Hub pages use Plus Jakarta Sans only.
- Lotus details are made up: phone +91 98765 43210, care@lotusclinic.in, Door 9-12-4, Beach Road, Siripuram. They are shown as text only. Call and WhatsApp buttons go to the demo's contact and book pages, not `tel:` or `wa.me`, so a demo tap never dials a real number.
- Lotus booking form: client-side checks only. Name, Indian mobile number, visit type, date (today to 60 days ahead, no Sunday clinic visits), time of day, reason, WhatsApp consent. Success shows a WhatsApp-style preview. Nothing is sent or stored. `/book?type=online` preselects online through `useSearchParams` inside Suspense.
- The whole hub sets `robots: noindex`, so the fictional clinic does not show up on Google.
- `npm run typecheck` runs `next typegen` first, because `PageProps` and `LayoutProps` come from generated files.
- Port 3000 was taken by the onlydevs_prod_1 dev server during this build, so the gates ran on 3001. `.claude/launch.json` still says 3000.
- 20 Oct 2026: hub verified by Abhinav's session (lint, tsc, 84 tests, build, 7 routes in the browser) and deployed. Live at https://od-demo-lyart.vercel.app. See hosting.md.
- Agent's open questions, not yet answered by Abhinav: Fraunces serif for Lotus headings; "Back to hub" goes to /clinic; cafe name "Bean Street Cafe" and its 6 services; robots noindex everywhere; SVG wordmark later; Lotus tel/WhatsApp links are internal, not real.

## 2026-10-20 (bookings level 2)

- Booking levels defined: 1 = WhatsApp link only (Dr. Gowthami today). 2 = store every booking in Postgres, notify the clinic, password-protected dashboard of upcoming bookings. 3 = level 2 plus real slots, WhatsApp Business API confirmations and reminders, cancel or reschedule by reply.
- Abhinav chose: build level 2 on the Lotus demo now, upgrade to level 3 later. Level 3 reuses the level 2 bookings table.
- Add the Google Maps embed to the Lotus demo (home contact block and contact page), as Dr. Gowthami's site has.
- Level 2 design: Postgres on Vercel (Neon) via DATABASE_URL. Same repository interface backed by an in-memory store when DATABASE_URL is missing, so dev and tests run without a database. Dashboard at /clinic/website/admin behind ADMIN_PASSWORD. Dashboard polls so a new booking appears within seconds. Email notification to the clinic via Resend when RESEND_API_KEY is set; skipped otherwise.

## 2026-10-21 (map + level 2 build)

- Google Maps embed is on the Lotus home contact block and the contact page (commit 0252666). The iframe uses loading="lazy", so it only paints when scrolled into view.
- Storage: `BookingStore` interface in `lib/bookings/`. `getStore()` returns the Neon Postgres store when DATABASE_URL is set, else the in-memory store. Driver: `@neondatabase/serverless` over HTTP, plain SQL with $n parameters, no ORM.
- Schema: `lib/bookings/schema.sql`, one `bookings` table (uuid id, created_at, clinic_slug, name, phone, visit_type, date, slot, reason, status new|confirmed|cancelled, notes). `npm run db:migrate` applies it. Safe to rerun.
- Dates are read as `date::text`, so the clinic's calendar day never shifts by server time zone. "Today" on the server is India time (Asia/Kolkata).
- POST /api/bookings reruns the form's `validateBooking`, normalises the phone to 10 digits, saves, returns `{ok, id, booking}` (201) or 400 with `fieldErrors`. Honeypot field `lotus_hp`: filled means a fake 201 and nothing saved. In-memory rate limit, 10 requests a minute per IP, also on admin login.
- Admin: /clinic/website/admin, a client page that asks /api/admin/session. Password from ADMIN_PASSWORD. Cookie `lotus_admin` is HMAC-signed (ADMIN_SECRET, falls back to the password), httpOnly, sameSite lax, secure in production, 12 hours. In `next dev` without ADMIN_PASSWORD the password is "demo" and the login screen says so. In production without it the page shows "Dashboard not configured".
- Dashboard: today and upcoming, grouped by day, morning first. Tiles for today, this week, new. Confirm and Cancel call PATCH /api/bookings/[id]. Polls every 5 s while the tab is visible, with a Live dot. Phone is masked until tapped. A note shows when storage is memory.
- Booking form posts to the API. Success says "Booking saved. The clinic will confirm on WhatsApp." with an 8-character booking id. The WhatsApp preview stays. Network and server errors show a red alert and keep the typed details.
- Email: Resend REST API when RESEND_API_KEY and CLINIC_NOTIFY_EMAIL are set, sent after the response through `after()`. Otherwise one log line "notify skipped: not configured". Never blocks the save. Logs never carry phone numbers or names. Default sender onboarding@resend.dev only mails the Resend account's own address until a domain is verified.
- The footer has a small "Clinic login" link to the dashboard. The dashboard is not in the main nav.
- Postgres store is tested only with a mocked driver. It has not run against a real database. No DATABASE_URL yet: Neon marketplace terms are pending with Abhinav.
- Without DATABASE_URL on Vercel, bookings live in one function instance's memory. They vanish on cold starts and may not show across instances. Fine for a quick look, not for a real demo.
- 21 Oct 2026: level 2 verified by Abhinav's session (lint, typecheck, 128 tests, build; test booking posted and seen live on the dashboard; map iframe present on contact) and deployed. Live dashboard shows "Dashboard not configured" until ADMIN_PASSWORD is set on Vercel. Bookings live in memory until DATABASE_URL is set; Neon terms still pending Abhinav.
- 21 Oct 2026: Neon terms accepted by Abhinav, database `od-demo-db` created through the Vercel marketplace and connected to project `od-demo`. Bookings table migrated. ADMIN_PASSWORD and ADMIN_SECRET set on Vercel (production, development; preview add did not stick, retry if previews need it). Live test: booking saved to Postgres, admin login OK, dashboard API listed it. Test row deleted. Values live in the git-ignored `.env.local`, never in chat.
- Local network quirk: the home router's DNS (192.168.29.1) refuses `*.neon.tech` hostnames, so `npm run db:migrate` fails locally with "fetch failed / ENOTFOUND". Cloudflare 1.1.1.1 resolves them. Workaround used: a one-off runner that gives undici a custom lookup via 1.1.1.1. Vercel itself has no such problem.

## 2026-10-21 (Lotus restyle)

- Abhinav's feedback on the Lotus clinic demo: fonts, colours and UI look generic, "AI generated". Hub (onlydevs pages) stays as is for now.
- Restyle the Lotus demo only. Keep it clean, minimal, straight and simple. Make it feel designed: a distinctive font pair (editorial serif headings, quiet sans body), one deep accent on warm off-white, no pastel panels, fewer uniform rounded cards, fewer pills and badges, smaller radii, thin rules, more space between sections. Same content, same routes, same booking flow and dashboard.

## 2026-10-21 (Lotus restyle build)

- Fonts for the Lotus site: Newsreader (headings, variable with optical size, italic used once, in the home headline) and Inter Tight (body and UI). Both via next/font, set on the Lotus site wrapper only, not preloaded on hub pages. Fraunces stays only for the hub's mocks of Lotus services.
- Body text 17px, line height 1.6, measures held to about 40 to 60ch.
- Palette, new tokens: paper #FAF8F4 (page), stone #EFEBE4 (portrait placeholder and map backdrop only), text #1B1C1A, grey #5F5B54 (secondary), forest #1F3D38 (the one accent: buttons, links, focus, live dot), forest-deep #152B27 (hover), rule #E4DFD6 (hairlines), edge #8F897F (form field borders, 3:1), error #A3392B. All text pairs pass AA. Field borders and focus pass 3:1. Tests cover both.
- Kept the old lotus-teal, mint, sand, cream, ink, body, line and rose tokens. The hub's service mocks (components/mocks) still use them, and the hub was out of scope.
- Removed from the Lotus site: mint and sand section backgrounds, the teal CTA band and teal footer, the uniform rounded-3xl card grids, icon tiles, the hero arch and circles art, the timeline dots, round pill buttons, the outline buttons, icons inside buttons, the animated ping on the live dot, and the uppercase teal eyebrows.
- New structure: sections separated by a 1px rule inside the content width, py-20 to py-32. Section heads put the title left and the intro right on wide screens. Services, reasons, hours and training are rows split by hairlines, not cards.
- Cards stay only where a surface helps: the booking form, the login and the dashboard day lists. White, 1px rule border, 8px radius, no shadow.
- Buttons: solid forest primary with 8px radius. Secondary actions are text links with an arrow. Shared class strings live in demos/lotus-clinic/ui.ts.
- Pills kept only on dashboard rows: visit type (outline) and status (New solid forest, Confirmed forest outline, Cancelled grey outline). 6px radius.
- Doctor portrait placeholder: stone panel with the initials in Newsreader. Replace with a real photo when the clinic sends one.
- Tests stub next/font/google in tests/setup.ts, because LotusSite now imports the fonts.
- 21 Oct 2026: Lotus restyle verified by Abhinav's session (lint, typecheck, 145 tests, build; home, services, why, book at 1440 and home at 375 in the browser) and deployed. Hub unchanged. Open: hub service mocks still use the old teal/Fraunces look; doctor portrait is an initials panel; forest #1F3D38 depth to confirm with Abhinav.
- 21 Oct 2026: Abhinav approved the Lotus restyle. Newsreader + Inter Tight, forest #1F3D38 on paper #FAF8F4, hairline rules, is now the Lotus look. Use it as the reference for future client-site demos.
- 21 Oct 2026: Abhinav asked for "a bit of colour" on Lotus after approving the restyle. Plan: add one warm secondary accent used sparingly (italic hero word, eyebrow labels, a few marks) and one tinted section band (soft sage or warm sand) so the page is not monochrome. Keep minimal: no return to pastel cards.

## 2026-10-21 (Lotus colour pass)

- New tokens in app/globals.css: `--color-lotus-terracotta` #A84F33, `--color-lotus-sage` #E6EDE8, `--color-lotus-sage-rule` #CFDAD3. Hub tokens untouched.
- Terracotta, not the brief's #C2603F: that measures 3.93:1 on paper, under AA for the 14px eyebrows. #A84F33 measures 5.17 on paper, 5.48 on white, 4.61 on sage.
- Terracotta is used for: the hero italic "every stage of life.", every Eyebrow label (all pages, including "Clinic staff"), a 32px terracotta rule before the hero eyebrow only, the 01 to 04 numbers in the "Why Lotus" rows, and the dashboard Live dot. Never on buttons. There is no "Free" tag on the Lotus site, so none was coloured.
- Sage chosen over sand: sand #F1E9DC sat too close to paper. Sage pairs with forest and lets terracotta read warm.
- Sage is a full-bleed band behind two sections: the home "Patient stories" section and the final "Book your visit today" CTA (home and services pages). No card inside. The band replaces the section's top hairline. The section after the testimonials band ("Visit us") drops its top rule. The footer drops its top rule when the page ends on a band (`data-band-end`).
- Text links on the band use the sage rule for their resting underline (`in-[[data-band]]` variant in ui.ts).
- Doctor portrait panel is sage instead of stone, initials stay forest. Home stat numbers (12+, 8,000+, 4.9) are forest instead of text black. Stone stays for the map backdrop and disabled buttons.
- tests/contrast.test.ts: 9 new pairs (terracotta on paper, white, sage; text, grey, forest on sage; non-text forest on sage, terracotta dot on paper and white). 154 tests pass.
- 21 Oct 2026: colour pass verified by Abhinav's session (lint, typecheck, 154 tests, build; hero and testimonials band at 1440) and deployed. Terracotta #A84F33 accents, sage #E6EDE8 bands.
- WhatsApp integration discussed. Plan: Meta WhatsApp Cloud API direct (not a provider). Demo via Meta's free test number and up to 5 verified recipients, no business verification needed. Real clinic numbers later need Meta business verification. Build: on Confirm send a "booking confirmed" template; daily 6 pm reminder job for tomorrow's bookings; webhook for replies and delivery status; two templates to submit. Start with a fake sender so the flow works before Meta credentials exist. Abhinav must create the Meta app and add the token and phone number ID to Vercel himself; values never pass through chat. Waiting on Abhinav's go.
- 21 Oct 2026: Meta app "Onlydevs" created (app id 1528502802643039) under business portfolio Onlydevs. WhatsApp test number +1 (555) 672-3191, Phone Number ID 1300202886519854, WhatsApp Business Account ID 1828837254914467. These are IDs, not secrets. The access token is a secret: Abhinav adds it to Vercel as WHATSAPP_TOKEN himself; never in chat or memory. Temporary tokens expire in 24 h; a permanent system-user token comes later.
- 21 Oct 2026: WHATSAPP_TOKEN added to Vercel (production) by Abhinav as a sensitive var. Sensitive vars cannot be pulled with `vercel env pull`, so real sends are tested on the deployed site, not locally. Local dev uses a fake sender that logs instead of sending.
- Level 3 part 1 build plan: lib/whatsapp/ Cloud API sender (Graph v25.0, phone number id 1300202886519854); on dashboard Confirm send a template to the patient; a `messages` table logs every send with status; dashboard row shows WhatsApp status; webhook route (GET verify with WHATSAPP_VERIFY_TOKEN, POST delivery statuses and replies); Vercel cron at 12:30 UTC (6 pm IST) for next-day reminders behind CRON_SECRET. Template names from env with `hello_world` as fallback until custom templates are approved. Agent drafts the two templates for Abhinav to create in WhatsApp Manager.

## 2026-10-21 (WhatsApp part 1 build)

- `lib/whatsapp/`: `client.ts` (Cloud API over fetch, Graph v25.0, `sendTemplate` and `sendText`, returns `{ok, messageId?, error?}`, never throws), `fake.ts` (logs "whatsapp (fake): template X to ••••1234", returns a fake wamid), `index.ts` (`getWhatsApp()`, `isConfigured()`, `whatsappSettings()`), `messages.ts` (template builders), `notify.ts` (`sendBookingMessage`: build, send, log), `webhook.ts` (signature check and payload parsing).
- Real sender only when WHATSAPP_TOKEN is set and WHATSAPP_FAKE is not 1. Phone number id defaults to the test number 1300202886519854.
- Template names come from env, each with `hello_world` as the fallback: WHATSAPP_TEMPLATE_CONFIRM, WHATSAPP_TEMPLATE_REMINDER, WHATSAPP_TEMPLATE_CLINIC_ALERT. hello_world goes with no components and always en_US. The log then shows what the custom template would say, with names and reasons replaced by labels.
- Custom template names drafted in docs/whatsapp-templates.md: `lotus_booking_confirmed`, `lotus_booking_reminder`, `lotus_new_booking_alert`. All Utility, en_US. Patient templates take first name, clinic, date ("Sat 24 Oct"), slot, visit type. The clinic alert takes full name, visit type, date, slot, reason.
- Patient number for WhatsApp is `91` plus the stored 10 digits.
- New `messages` table in schema.sql: booking_id references bookings with ON DELETE CASCADE, kind confirmation | reminder | cancellation | clinic_alert, channel whatsapp, to_masked (last 4 only), template, provider_message_id (unique when set), status queued | sent | delivered | read | failed, error, created_at, updated_at. Not migrated yet: `npm run db:migrate` must run from a machine that resolves neon.tech.
- BookingStore gained `logMessage`, `updateMessageStatus(providerMessageId, status, error?)` and `listMessagesForBookings(ids)`. Status only moves forward (queued, sent, delivered, read; failed beats all), because Meta webhooks can arrive out of order.
- Confirm: PATCH to confirmed sends the confirmation after the response through `after()`. Never blocks or fails the status change. Only one confirmation per booking unless the earlier one failed, so a failed send can be retried by confirming again. Cancel sends nothing yet (TODO for part 2).
- New booking: POST /api/bookings also sends `clinic_alert` to CLINIC_WHATSAPP (E.164 digits, no plus, no default) after the response. Unset means one log line "whatsapp clinic alert skipped: CLINIC_WHATSAPP not set". Never blocks the save. Scope added by Abhinav mid-build.
- Dashboard: each row shows the latest patient-facing message, "WhatsApp: sent 8:51 pm", "WhatsApp reminder: delivered 6:01 pm" or "WhatsApp: failed: <reason>" (failed in the error colour), in India time. The clinic alert is left out of the row. GET /api/bookings adds `whatsapp: {kind, status, error, at} | null` to each booking. If the message query fails, bookings still load.
- Webhook /api/whatsapp/webhook: GET echoes hub.challenge when hub.verify_token matches WHATSAPP_VERIFY_TOKEN, else 403. POST checks X-Hub-Signature-256 against WHATSAPP_APP_SECRET when set (bad signature gets 401; unset logs one line and skips the check), updates statuses by provider id, logs inbound messages as type and length only. No number, no text. Answers 200 otherwise, including to junk.
- Reminders: /api/cron/reminders, GET, needs `Authorization: Bearer CRON_SECRET` (503 when CRON_SECRET is unset). Sends the reminder to confirmed bookings dated tomorrow in India with no reminder logged yet. A failed reminder counts as logged and is not retried. vercel.json schedules it at 30 12 * * * (6 pm IST).
- The cron route reads the auth header before anything else, so `next build` never prerenders it.
- Error text from Meta is scrubbed of long digit runs and cut to 160 characters before it is logged or stored.
- 21 Oct 2026: verified locally with the memory store and the fake sender only (lint, typecheck, 192 tests, build, dev server curl run, dashboard at 1440). The real Cloud API call is untested; it can only run on Vercel, where WHATSAPP_TOKEN lives.
- 21 Oct 2026: WhatsApp part 1 verified by Abhinav's session (lint, typecheck, 192 tests, build) and deployed. Messages table migrated on Neon. On Vercel production: CRON_SECRET and WHATSAPP_VERIFY_TOKEN (generated, sensitive by default when piped into `vercel env add`), ADMIN_PASSWORD re-set to the value Abhinav edited into .env.local (8 chars). Live test: confirmed Abhinav's own booking, Meta accepted the send, dashboard shows "WhatsApp: sent" with hello_world. Delivery to his phone awaits his confirmation.
- Not yet set on Vercel: CLINIC_WHATSAPP (Abhinav must add his own number as 91 + 10 digits; the session is not allowed to copy phone numbers out of the database), WHATSAPP_APP_SECRET, the three custom template names. Webhook not yet configured in the Meta app. Permanent token not yet made. Steps in docs/whatsapp-templates.md.
- Gotcha: `vercel env pull` returns "" for sensitive vars; piped `vercel env add` makes vars sensitive by default. Shell-interpolating a password into curl JSON failed once; encode JSON with python instead.
- 21 Oct 2026: two live confirms show "WhatsApp: sent" but nothing arrived on Abhinav's phone (number ending 7566). Likely cause: the number is not on the test number's allowed recipient list. Asked Abhinav to send hello_world from the Meta page directly as the control test. WHATSAPP_VERIFY_TOKEN regenerated, stored on Vercel and in .env.local, webhook handshake at /api/whatsapp/webhook answers 200. Next: Abhinav configures the webhook in the Meta app so delivery and failure statuses reach the dashboard.
- 21 Oct 2026: root cause of no WhatsApp delivery found via Meta's test webhook log: status "failed", error 131031 "Business Account locked". The new WABA 1828837254914467 is locked by Meta. Code, token, recipient list and phone are all fine. Abhinav must request a review in Meta Business Support Home or Business Settings → WhatsApp accounts. No code change needed once unlocked.
- Abhinav's screenshots exposed part of the temporary access token on screen. Regenerate it and update WHATSAPP_TOKEN on Vercel after the account unlocks.
