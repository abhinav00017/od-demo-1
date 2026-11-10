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

## Queued: FINAL plan approved by Abhinav 10 Nov 2026 (build after item 2 lands; same files)
Abhinav's decisions: keep the slot windows (Morning 10–1, Afternoon, Evening); no exact-time picker and no clinic-hours settings; the patient may arrive any time inside the booked window. No "Confirm by WhatsApp / Phone call" choice on the form. The day-before reminder has no button. Patient confirmation is needed only when the clinic changes the day or slot.
3. On booking: WhatsApp "We've received your request for {day}, {slot window}. The clinic will confirm on WhatsApp." (no buttons). The booking success preview shows exactly this message.
4. Staff press Confirm: WhatsApp "Your visit at Lotus Women's Clinic is confirmed for {day}, {slot window}. You can come any time in this window." with a "View or change" link button. No quick-reply buttons.
5. Day before: plain reminder "See you tomorrow, {day}, {slot window}." with the "View or change" link. No buttons.
6. Staff change the day or slot from the dashboard: WhatsApp "Your visit has moved to {day}, {slot window}." with quick-reply buttons Confirm / Change; booking waits for the patient; Confirm → "Thank you, see you on…"; Change → link to their page.
7. Opt-out: "Reply STOP to stop messages" in the reminder; inbound STOP marks the number opted out; nothing more is sent to it.
8. No WhatsApp: when a message comes back undeliverable, mark the booking and phone "No WhatsApp"; dashboard shows "No WhatsApp. Call to confirm." in Needs action with Call and "Confirmed by phone"; reminders for those patients appear in a "Call to remind" list; remembered per phone. Success screen copy: "We'll confirm on WhatsApp. If you're not on WhatsApp, the clinic will call you." No SMS.
9. Patient page via unique link /clinic/website/v/<token> (random, no login, expires after the visit date): clinic, day, slot window, visit type, address with directions, add to calendar, change day or slot (lands on the dashboard as "Wants new time" with the requested slot), cancel. No reason or health details.
10. Dashboard: staff can change a booking's day or slot (sends 6); "Call to confirm" / "Confirmed by phone" for No-WhatsApp; hide "via Twilio", show "WhatsApp: delivered".
11. Wording: "Prescription on WhatsApp" and prescriptions/reports-over-WhatsApp claims (Lotus data.ts, hub industries.ts) become "sent as a secure link".
12. Consent record on every booking: consent_at (timestamp), consent_text (the exact line shown, versioned), consent_source (website form / staff with "Send on WhatsApp" ticked). Shown in the patient panel as a small "WhatsApp consent: website, 10 Nov 2026, 10:42" line. Staff bookings without the tick have no consent and get no WhatsApp. Approved by Abhinav 10 Nov 2026.
Templates to submit after the Twilio upgrade: request received; visit confirmed (+ link button); reminder (+ link button); visit moved (+ Confirm / Change quick replies).
Dropped: exact-time picker, clinic hours settings, "Confirm by" choice, clinic-proposes-a-time flow, "I'll be there" button, the join opt-in step.

## Needs Abhinav (not code)
- Upgrade Twilio off trial (~$20 credit) and submit the two templates with buttons, so the live demo sends the promised wording instead of Twilio's sample text. Trial ends around 20 Nov 2026.
- Final deploy: Abhinav said "deploy" on 10 Nov, then chose "wait for all": deploy everything together once the admin redesign (item 2) and items 3-12 are built and verified. Do NOT ship pieces earlier. Then: clean-worktree gates, migrate + seeds on Neon (Cloudflare DNS runner), deploy, live check.

**How to apply:** Read this before any deploy and before starting queued work. Update it whenever something is committed, built or shipped.

## Notes
- 10 Nov 2026: .env.local was found missing (no agent reported deleting it). Rebuilt with `vercel env pull` (DATABASE_URL and the integration vars) plus ADMIN_PASSWORD and CRM_ADMIN_PASSWORD written back by hand; both verified against the live logins. Sensitive Vercel vars (ADMIN_SECRET, CRON_SECRET, WHATSAPP_VERIFY_TOKEN, Twilio, WHATSAPP_TOKEN) are only on Vercel and pull back empty; not needed locally. Agents must never move, copy or delete .env.local again.
- Admin redesign open questions, decided by the main session as defaults: a booking on a demo-block number (90000 2xxxx) counts as demo data and is cleared by Reset; source strip counts bookings created in the last 30 days; "visits" counts visited only; reschedule sends the item-6 "visit moved" message, not a fresh confirmation; Past excludes today.
