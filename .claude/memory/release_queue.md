---
name: release_queue
description: Undeployed changes and queued work for the next final deployment of the demo hub
metadata:
  type: project
---

Single list of what is committed-but-undeployed and what is queued, per [[feedback_batch_deploys]]. Clear items only after the final deploy is verified live.

## Committed, not deployed
1. Lotus booking form: consent checkbox replaced by a line under the button (3aec85a).

## Building now
2. Clinic admin redesign + demo data (tabs, patient history, lead source capture, visited/no-show, staff bookings, Reset demo data). Needs at deploy: `npm run db:migrate`, `npm run db:seed-clinic-demo`.

## Queued (approved 10 Nov 2026, build after item 2 lands; same files)
3. Send a short "request received" WhatsApp on new booking (no buttons); booking success preview shows exactly that message.
4. Reverse the confirm flow to match the promised mock: dashboard "Confirm" becomes "Send time"; message "Hi {name}, Dr. Rao can see you on {date} at {time} at the clinic. Please confirm." with quick-reply buttons Confirm / Change time; booking turns Confirmed only when the patient taps Confirm; "Thank you, see you on…" reply.
5. Exact-time picker on "Send time" (the patient picks a slot; staff set the time).
6. Opt-out: "Reply STOP to stop messages" in the reminder; inbound STOP marks the number opted out and nothing more is sent.
7. Replace "Prescription on WhatsApp" / prescriptions-and-reports-over-WhatsApp claims (Lotus data.ts, hub industries.ts previews) with "sent as a secure link".
8. Hide "via Twilio" on dashboard rows; show "WhatsApp: delivered" only.

## Needs Abhinav (not code)
- Upgrade Twilio off trial (~$20 credit) and submit the two templates with buttons, so the live demo sends the promised wording instead of Twilio's sample text. Trial ends around 20 Nov 2026.
- Final deploy: say "deploy". Then: clean-worktree gates, migrate + seeds on Neon (Cloudflare DNS runner), deploy, live check.

**How to apply:** Read this before any deploy and before starting queued work. Update it whenever something is committed, built or shipped.
