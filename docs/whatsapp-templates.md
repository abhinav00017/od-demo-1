# WhatsApp setup for the Lotus demo

The code sends WhatsApp through one of two providers. `WHATSAPP_PROVIDER` picks it.

- **Twilio**, for demos now. Sends Twilio Content Templates. See "Twilio" below.
- **Meta Cloud API**, for verified businesses. Sends templates. Until the templates below are approved, it sends Meta's `hello_world` instead, and the server log shows what the real template would have said.

Unset `WHATSAPP_PROVIDER` means: Twilio if its three vars are set, else Meta if `WHATSAPP_TOKEN` is set, else a fake sender that only logs.

## Twilio

Meta needs business verification before it sends to real numbers. Twilio's quickstart does not.
It runs on a Twilio trial account, so it is for demos, not for clinics.

### The quickstart sender replaces the sandbox

Twilio's WhatsApp quickstart no longer uses the shared sandbox number (+1 415 523 8886) and its `join` code.
It gives your account its own sender number, shown on the quickstart page.
Put that number in `TWILIO_WHATSAPP_FROM`.

This sender only takes business-initiated messages as a **Content Template**:
a `ContentSid` (starts with `HX`) plus `ContentVariables`.
Plain text (`Body`) fails with error 21654 "ContentSid Required".
The dashboard then shows the error with the hint "set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet".

### Keys

1. Twilio console home, under Account Info: copy the **Account SID** (starts with `AC`) and the **Auth Token** (click Show).
2. On Vercel (Production), add:
   - `TWILIO_ACCOUNT_SID` = the Account SID
   - `TWILIO_AUTH_TOKEN` = the Auth Token (sensitive)
   - `TWILIO_WHATSAPP_FROM` = your quickstart sender, like `+17372508034`
   - `TWILIO_CONTENT_SID_REQUEST_RECEIVED` = the HX sid of the request received template (see below)
   - `TWILIO_CONTENT_SID_CONFIRM` = the HX sid of the visit confirmed template
   - `TWILIO_CONTENT_SID_REMINDER` = the HX sid of the reminder template
   - `TWILIO_CONTENT_SID_VISIT_MOVED` = the HX sid of the visit moved template
   - `TWILIO_CONTENT_SID_CLINIC_ALERT` = the HX sid of the clinic alert template (optional)
   - `WHATSAPP_PUBLIC_URL` = `https://od-demo-lyart.vercel.app`
   - `WHATSAPP_PROVIDER` = `twilio` (optional; the Twilio vars alone pick it)
   - `TWILIO_JOIN_KEYWORD` = the word after "join" on the quickstart page, like `twilio-trail` (see "Opt-in" below)
3. Redeploy.

If the reminder or clinic alert sid is unset, that message reuses the confirmation sid, and the server log says so.
That lets the demo run on one template, like Twilio's sample, until the custom ones are approved.
If no sid is set at all, Twilio gets plain text. That only lands inside a 24 hour session the recipient opened by messaging the sender.
Outside it, sends fail with error 63016, also shown with the hint.

Never paste the Auth Token or the Account SID in chat, code or memory files. GitHub push protection blocks Account SIDs.

### The four patient templates

All four go to the patient. All are category **Utility**, language English. The words are in `lib/whatsapp/texts.ts`
(`PATIENT_BODIES`); the booking success screen shows the "request received" text from the same function, so the two never drift.
`{{1}}` is the day ("Sat 24 Oct"), `{{2}}` the slot window ("Morning, 10 am – 1 pm"). The token is the end of the
patient's own page link, `https://od-demo-lyart.vercel.app/clinic/website/v/<token>`, 24 url-safe characters.
Every link uses `WHATSAPP_PUBLIC_URL` (the live demo's origin when unset).

| When | Kind | Twilio env var | Meta env var | Buttons |
| --- | --- | --- | --- | --- |
| Patient books on the website | `request_received` | `TWILIO_CONTENT_SID_REQUEST_RECEIVED` | `WHATSAPP_TEMPLATE_REQUEST_RECEIVED` | none |
| Staff press Confirm | `confirmation` | `TWILIO_CONTENT_SID_CONFIRM` | `WHATSAPP_TEMPLATE_CONFIRM` | URL "View or change" |
| Day before, 6 pm (cron) | `reminder` | `TWILIO_CONTENT_SID_REMINDER` | `WHATSAPP_TEMPLATE_REMINDER` | none (link in the body) |
| Staff change the day or slot | `visit_moved` | `TWILIO_CONTENT_SID_VISIT_MOVED` | `WHATSAPP_TEMPLATE_VISIT_MOVED` | quick replies Confirm / Change |

#### 1. Request received: `lotus_request_received`

```
We've received your request for {{1}}, {{2}}. The clinic will confirm on WhatsApp.
```

- Variables: {{1}} `Sat 24 Oct`, {{2}} `Morning, 10 am – 1 pm`
- Buttons: none. Twilio content type: **Text**.

#### 2. Visit confirmed: `lotus_visit_confirmed`

```
Your visit at Lotus Women's Clinic is confirmed for {{1}}, {{2}}. You can come any time in this window.
```

- Variables: {{1}} `Sat 24 Oct`, {{2}} `Morning, 10 am – 1 pm`, {{3}} the token (sample `Xk3v9QmT0bLr2aWc8YpE5nHd`).
- Button: one **URL** button (call to action), label `View or change`, URL `https://od-demo-lyart.vercel.app/clinic/website/v/{{3}}`.
  Twilio content type: **Call to action**, with the URL ending in the variable. Meta: a dynamic URL button whose suffix is the token.
- No quick replies.

#### 3. Reminder: `lotus_visit_reminder`

```
See you tomorrow, {{1}}, {{2}}.
View or change: {{3}}
Reply STOP to stop messages.
```

- Variables: {{1}} `Sat 24 Oct`, {{2}} `Morning, 10 am – 1 pm`, {{3}} the whole page link
  (sample `https://od-demo-lyart.vercel.app/clinic/website/v/Xk3v9QmT0bLr2aWc8YpE5nHd`).
- Buttons: none (Abhinav's decision: the day-before reminder has no button). Twilio content type: **Text**.

#### 4. Visit moved: `lotus_visit_moved`

```
Your visit has moved to {{1}}, {{2}}.
```

- Variables: {{1}} `Sat 24 Oct`, {{2}} `Evening, 5 pm – 7 pm`
- Buttons: two **Quick Reply** buttons, `Confirm` (ID `confirm`) and `Change` (ID `change`). Twilio content type: **Quick Reply**.

#### Creating them in Twilio

1. Twilio console > Messaging > Content Template Builder > Create new.
2. Name and content type as above. Language: English.
3. Body: paste the text with `{{1}}`.. as written. Add the sample for each variable.
4. Add the buttons listed for that template.
5. Save, then **Submit for WhatsApp approval**. Category: **Utility**.
6. When it shows Approved, copy its **Content SID** (starts with `HX`) into the matching env var on Vercel. Redeploy.

The code sends the variables in the order listed in `CONTENT_VARIABLES` in `lib/whatsapp/messages.ts`.

Fallback when a kind has no sid: request received and visit moved send plain text (Body), which only lands inside a 24 hour
session the patient opened. Plain text carries what the buttons would: the confirmation adds "View or change: <link>",
visit moved adds "Reply Confirm or Change.". The reminder and the clinic alert reuse `TWILIO_CONTENT_SID_CONFIRM` when theirs
is unset, as before (the log says so). Twilio's sample template takes two variables; the confirmation now sends three.

#### New booking alert (to the clinic): `lotus_new_booking_alert` → `TWILIO_CONTENT_SID_CLINIC_ALERT`

```
New booking: {{1}}, {{2}}. Open the dashboard to confirm.
```

Samples: {{1}} `Priya (Clinic visit)`, {{2}} `Sat 24 Oct, Morning, 10 am – 1 pm`

{{1}} is the patient's first name and visit type. The reason is not sent, to keep it off Twilio.

### Opt-in: the join step

On a trial account, Twilio only delivers to numbers that first sent `join <keyword>` to the sender.
The demo makes that step part of the flow:

- **Booking success screen.** After "Booking saved", a block "Get updates on WhatsApp" with an **Open WhatsApp** button.
  It opens `https://wa.me/<sender digits>?text=join%20<keyword>`, with the join message typed in. The patient taps Send.
- **Clinic dashboard.** A "WhatsApp opt-in" panel under the counts: a QR code of the same link for the front desk,
  the join message in monospace, and the plain link.

Both read `TWILIO_WHATSAPP_FROM` and `TWILIO_JOIN_KEYWORD` on the server (`whatsappOptIn` in `lib/whatsapp/optin.ts`)
and pass the link down as a prop. Neither is a secret, and neither is a `NEXT_PUBLIC_` var.
The pages are static, so a change to either var shows after the next deploy.

The block and the panel only show when the provider is Twilio and both vars are set.
For a verified business sender there is no join step: leave `TWILIO_JOIN_KEYWORD` unset (or switch to Meta) and both disappear.
`WHATSAPP_FAKE=1` hides them too, because the fake sender needs no join.

A send to someone who has not joined fails. If Twilio answers 21654 or 63016, the dashboard row shows
"Hint: set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet" under the error.

### Who gets messages

Every patient send checks, in this order, and logs a "skipped (<reason>)" row instead of calling the provider:

1. **Opted out**: the phone sent STOP (table `whatsapp_optouts`). Row line: "WhatsApp: opted out".
2. **No consent**: the booking has no `consent_source`. Website bookings store the line under the button
   (`CONSENT_TEXT_V1` in `lib/bookings/consent.ts`); staff bookings only when "Send on WhatsApp" is ticked.
3. **No WhatsApp**: the booking or the phone (table `whatsapp_unreachable`) is marked not on WhatsApp.
4. **Demo**: an `is_demo` booking or a 90000 2xxxx number.

A send or a status callback that fails with one of these codes marks the booking No WhatsApp and remembers the phone:

- Twilio **63024** "Invalid message recipient" and **63003** "Channel could not find To address"
  (https://www.twilio.com/docs/api/errors/63024, https://www.twilio.com/docs/api/errors/63003).
- Meta **131026** (message undeliverable: not a WhatsApp user).

The dashboard then shows the amber chip "No WhatsApp. Call to confirm." in Needs action, with **Call** and **Confirmed by phone**.
The reminder job skips those bookings; Today shows them under "Call to remind".

### Inbound webhook

Patient replies come to this URL:

```
https://od-demo-lyart.vercel.app/api/whatsapp/twilio-inbound
```

1. Twilio console > **Try out WhatsApp** > **Receive a message**.
2. Choose **Custom webhook**, paste the URL above, method **HTTP POST**. Save.

These menu names come from the brief and were not checked against the live console.

What it does. The sender's booking is their newest open one (new or confirmed, today or later), preferring one waiting for them:

- **STOP**, and Twilio's other opt-out words (STOPALL, UNSUBSCRIBE, END, QUIT, REVOKE, OPTOUT): the phone is opted out of
  every message. CANCEL is not an opt-out word here (see Cancel below). The first time, the reply is "You won't get more WhatsApp messages from Lotus Women's Clinic. Reply START to turn them back on."
- **START** or UNSTOP: the opt-out is removed, with a short reply.
- **Confirm** (or `confirm`, `c`, `yes`), only when staff moved the visit (`awaiting_patient`): the wait clears, the row loses
  "Waiting for patient", and the patient gets "Thank you, see you on <day>, <slot>."
- **Change** (or `change`, `r`, `reschedule`), only when staff moved the visit: the reply is the patient's own page link.
- **Cancel** (`cancel`, any case), with an upcoming open booking: the reply is "To cancel or change your visit, open: <patient page link>".
  Nothing is cancelled and nothing is opted out. Without a booking it gets the polite reply below.
- Confirm or Change without a moved visit, Cancel without a booking, anything else, or no open booking: one polite reply per sender per hour with the
  booking link and the clinic phone. Opted-out numbers get no auto-reply.

The route checks Twilio's signature with `TWILIO_AUTH_TOKEN`, like the status callback, and answers 403 when it is wrong.
Server logs carry the intent, the last 4 digits and the booking reference. Never the message text.
The messages table logs each reply as kind `inbound` (template = the intent) and each tap on Confirm as `patient_confirmed`.

These need the columns and tables from `lib/bookings/schema.sql`. Run `npm run db:migrate` on Neon before deploying.

### Delivery statuses

Each send asks Twilio to post its status to the URL below, when `WHATSAPP_PUBLIC_URL` is set.
If the console offers a status callback URL for the sender, paste the same URL there, method POST:

```
https://od-demo-lyart.vercel.app/api/whatsapp/twilio-status
```

The route checks Twilio's signature with `TWILIO_AUTH_TOKEN`. The dashboard row then moves from "sent" to "delivered" or "read". It never names the provider.
The message log stores the HX sid in its `template` column for content sends, and `text` for plain-text sends.

### Meta stays

The Meta route is unchanged. For a verified business, set `WHATSAPP_PROVIDER=meta` (or remove the Twilio vars) and follow the steps below.

## 1. Create the templates

Go to WhatsApp Manager > Message templates > Create template. Create the four patient templates above
(`lotus_request_received`, `lotus_visit_confirmed`, `lotus_visit_reminder`, `lotus_visit_moved`), category Utility,
English (US) `en_US`, with the same bodies, samples and buttons. For the confirmation, add a **Visit website** button
with a **Dynamic** URL `https://od-demo-lyart.vercel.app/clinic/website/v/{{1}}`; the code sends the token as that button's
parameter. For visit moved, add two **Custom** quick-reply buttons, `Confirm` and `Change`; the code sends payloads `confirm` and `change`.

The clinic alert stays as it was:

### New booking alert (to the clinic)

This one goes to the clinic's own number on every new booking, so staff know a request came in.

- Category: Utility
- Name: `lotus_new_booking_alert`
- Language: English (US), code `en_US`
- Body:

  ```
  New booking: {{1}} ({{2}}), {{3}} {{4}}, reason {{5}}. Open the dashboard to confirm.
  ```

- Sample values: {{1}} `Priya Sharma`, {{2}} `Clinic visit`, {{3}} `Sat 24 Oct`, {{4}} `Morning, 10 am – 1 pm`, {{5}} `Pregnancy care`

Approval usually takes minutes to a day.

When they show "Active", set these on Vercel (Production), then redeploy:

- `WHATSAPP_TEMPLATE_REQUEST_RECEIVED` = `lotus_request_received`
- `WHATSAPP_TEMPLATE_CONFIRM` = `lotus_visit_confirmed`
- `WHATSAPP_TEMPLATE_REMINDER` = `lotus_visit_reminder`
- `WHATSAPP_TEMPLATE_VISIT_MOVED` = `lotus_visit_moved`
- `WHATSAPP_TEMPLATE_CLINIC_ALERT` = `lotus_new_booking_alert`
- `WHATSAPP_TEMPLATE_LANG` = `en_US`

Also set `CLINIC_WHATSAPP` to the clinic's own number: digits only, `91` then 10 digits, no plus.
Without it, no clinic alert is sent. While on the test number, that number must be one of the 5 verified recipients.

If Meta asks for a different wording, keep the placeholders in the same order: day, slot window, then the link (reminder only).

## 2. Connect the webhook

The webhook gives the dashboard "delivered" and "read", and logs replies.

1. Pick a verify token: any long random string. Add it on Vercel as `WHATSAPP_VERIFY_TOKEN`, then redeploy.
2. In the Meta app (developers.facebook.com > Onlydevs), copy App settings > Basic > App secret. Add it on Vercel as `WHATSAPP_APP_SECRET`, then redeploy.
3. Open WhatsApp > Configuration. Under Webhook, click Edit.
4. Callback URL: `https://od-demo-lyart.vercel.app/api/whatsapp/webhook`. Verify token: the value from step 1. Click Verify and save.
5. Under Webhook fields, click Manage and subscribe to `messages`. That one field carries both delivery statuses and replies.
6. Test: confirm a booking for a verified test recipient. The dashboard row should move from "sent" to "delivered" within a minute.

## 3. Make a permanent token

The token on the API Setup page expires in 24 hours. For a token that does not expire:

1. Open business.facebook.com > Settings > Users > System users. Add one, role Admin.
2. Click Add assets. Pick Apps > Onlydevs, full control. Also add the WhatsApp account, full control.
3. Click Generate new token. App: Onlydevs. Expiry: Never.
4. Tick `whatsapp_business_messaging` and `whatsapp_business_management`. Generate.
5. Copy it once. Replace `WHATSAPP_TOKEN` on Vercel (Production, sensitive), then redeploy.

Never paste the token in chat, code or memory files.

## 4. Reminders

Vercel Cron calls `/api/cron/reminders` daily at 12:30 UTC, which is 6 pm in India.
It sends the reminder to every confirmed booking for tomorrow that has no reminder yet.
Set `CRON_SECRET` on Vercel to a long random string. Vercel sends it automatically.
On the Hobby plan, Vercel may run the job any time within that hour.

## Meta test number limits

The test number +1 (555) 672-3191 only sends to up to 5 numbers you verify on the API Setup page.
Real clinic numbers need Meta business verification first.
