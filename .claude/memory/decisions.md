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
