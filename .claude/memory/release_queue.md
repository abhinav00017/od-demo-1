---
name: release_queue
description: Undeployed changes and queued work for the next final deployment of the demo hub
metadata:
  type: project
---

Single list of what is committed-but-undeployed and what is queued, per [[feedback_batch_deploys]]. Clear items only after the final deploy is verified live.

## Committed, not deployed
1. Lotus booking form: consent checkbox replaced by a line under the button (3aec85a).

## Committed, not deployed (cont.)
2. Clinic admin redesign + demo data (eecf6f7..670622c; verified on a clean worktree 10 Nov: lint, typecheck, 587 tests, build) (tabs, patient history, lead source capture, visited/no-show, staff bookings, Reset demo data). Needs at deploy: `npm run db:migrate`, `npm run db:seed-clinic-demo`.

## Committed, not deployed (cont.): items 3–12, the FINAL plan approved by Abhinav 10 Nov 2026
Commits fed76b1..0ef8831 (store + schema + seed fed76b1; messages, inbound, view API 5eda2a7; patient page + dashboard c9a7110; wording 53f2069; docs + .env.example 0ef8831). Verified in the main checkout 10 Nov: lint clean, typecheck clean for these files (only the halted CRM work in demos/tiles-crm/Today.tsx fails), 646 tests, dev run on the memory store against a local Twilio mock. `npm run build` NOT run (not allowed in this checkout).
3. Request received on website booking (kind request_received, no buttons); the success screen shows the same text from the same function. Success line: "We'll confirm on WhatsApp. If you're not on WhatsApp, the clinic will call you."
4. Visit confirmed on staff Confirm, with a "View or change" URL button (token suffix). Plain-text fallback adds "View or change: <link>".
5. Reminder: "See you tomorrow, {day}, {slot}." + "View or change: <link>" + "Reply STOP to stop messages." No buttons.
6. Staff "Change day or slot" sends visit_moved (Confirm / Change quick replies) and sets awaiting_patient ("Waiting for patient" chip) when the patient can be reached. Inbound Confirm clears it ("Thank you, see you on…"); Change replies with the patient page link. Confirm/Change without awaiting_patient = OTHER.
7. STOP (+ Twilio's STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, REVOKE, OPTOUT) → whatsapp_optouts, one reply; START/UNSTOP removes it. Every patient send checks opt-out first ("skipped (opted out)"). Row line "WhatsApp: opted out".
8. No WhatsApp: Twilio 63024 / 63003 and Meta 131026 (send or status callback) mark the booking no_whatsapp and the phone in whatsapp_unreachable; later bookings skip. Amber "No WhatsApp. Call to confirm." in Needs action with Call (tel:) and "Confirmed by phone" (phone_confirmed_at, sends nothing). Today tab "Call to remind" for tomorrow's No-WhatsApp visits. Cron skips them.
9. Patient page /clinic/website/v/<token> (24-char base64url token; old rows get 64 hex from the migration). API /api/bookings/view/<token>: GET, POST change/cancel, 30/min per IP, 404 unknown, 410 after the visit day. No name, phone, reason or notes. .ics built in the browser.
10. Dashboard: "Change day or slot" on every open booking (leads for "Wants a new time", prefilled with the requested day/slot shown on the chip); no provider name anywhere.
11. "Prescription on WhatsApp" etc. → "sent as a secure link" (Lotus data.ts, hub industries.ts).
12. consent_at / consent_text / consent_source. Website stores CONSENT_TEXT_V1 (lib/bookings/consent.ts); staff only with "Send on WhatsApp" ticked (STAFF_CONSENT_TEXT_V1), else null and every send is "skipped (no consent)". Patient panel: "WhatsApp consent: website, 10 Nov 2026, 10:42" / "No WhatsApp consent".
Also fixed on the way: the amber chips had no colour (the theme resets Tailwind's palette); new tokens lotus-warn / -soft / -line.

Needs at deploy, in order (from a machine that resolves neon.tech): `npm run db:migrate` (adds the booking columns, backfills view_token and website consent on old rows, widens messages_kind_check, creates whatsapp_optouts and whatsapp_unreachable), then `npm run db:seed-clinic-demo`. Migrate BEFORE deploying: every bookings query now selects the new columns.
New env vars (all optional; unset = today's fallbacks): TWILIO_CONTENT_SID_REQUEST_RECEIVED, TWILIO_CONTENT_SID_VISIT_MOVED (plain text when unset, never reuse CONFIRM), WHATSAPP_TEMPLATE_REQUEST_RECEIVED, WHATSAPP_TEMPLATE_VISIT_MOVED (hello_world when unset). WHATSAPP_PUBLIC_URL (already on Vercel) now also builds every patient link; unset = https://od-demo-lyart.vercel.app.
Templates to submit after the Twilio upgrade (docs/whatsapp-templates.md, "The four patient templates"): lotus_request_received, lotus_visit_confirmed (+ URL button), lotus_visit_reminder (link in body), lotus_visit_moved (+ Confirm / Change).
Dropped: exact-time picker, clinic hours settings, "Confirm by" choice, clinic-proposes-a-time flow, "I'll be there" button, the join opt-in step.

## Needs Abhinav (not code)
- Upgrade Twilio off trial (~$20 credit) and submit the two templates with buttons, so the live demo sends the promised wording instead of Twilio's sample text. Trial ends around 20 Nov 2026.
- Final deploy: Abhinav said "deploy" on 10 Nov, then chose "wait for all": deploy everything together once the admin redesign (item 2) and items 3-12 are built and verified. Do NOT ship pieces earlier. Then: clean-worktree gates, migrate + seeds on Neon (Cloudflare DNS runner), deploy, live check.

**How to apply:** Read this before any deploy and before starting queued work. Update it whenever something is committed, built or shipped.

## Notes
- 10 Nov 2026: .env.local was found missing (no agent reported deleting it). Rebuilt with `vercel env pull` (DATABASE_URL and the integration vars) plus ADMIN_PASSWORD and CRM_ADMIN_PASSWORD written back by hand; both verified against the live logins. Sensitive Vercel vars (ADMIN_SECRET, CRON_SECRET, WHATSAPP_VERIFY_TOKEN, Twilio, WHATSAPP_TOKEN) are only on Vercel and pull back empty; not needed locally. Agents must never move, copy or delete .env.local again.
- Items 3–12 build defaults (10 Nov 2026, not yet confirmed by Abhinav): visit_moved keeps the booking confirmed and adds "Waiting for patient"; awaiting_patient is set only when the patient can be messaged (consent, not opted out, not No WhatsApp; demo counts as reachable). The reminder and clinic alert still borrow TWILIO_CONTENT_SID_CONFIRM when theirs is unset; request received and visit moved never do. "Cancel" is an opt-out word (Twilio's list), so a patient typing "cancel" is opted out, not cancelled. The Call to remind list shows No-WhatsApp visits only (not opted-out or no-consent ones). A failed opt-out lookup blocks the send. The migration gives website consent only to rows whose token came from the backfill (64 chars), so a rerun never marks later staff bookings.
- Admin redesign open questions, decided by the main session as defaults: a booking on a demo-block number (90000 2xxxx) counts as demo data and is cleared by Reset; source strip counts bookings created in the last 30 days; "visits" counts visited only; reschedule sends the item-6 "visit moved" message, not a fresh confirmation; Past excludes today.
- 10 Nov 2026 (supersedes the "cancel" and Call to remind defaults above): "cancel" is no longer an opt-out word; with an upcoming booking it replies "To cancel or change your visit, open: {patient page}", else the normal reply. Cancelled bookings show no actions on any tab, and PATCH confirmed/visited/no_show (by phone too) on them answers 409. Call to remind lists tomorrow's confirmed visits that are No WhatsApp, opted out or no consent, with a grey reason note. Committed a90cfee, 419069a, 75e9aa1; not deployed. Note: Twilio may still treat CANCEL as an opt-out on its own side (Advanced Opt-Out), not checked.
