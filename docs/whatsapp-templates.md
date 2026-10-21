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
The dashboard then shows the error with the hint "set TWILIO_CONTENT_SID_*".

### Keys

1. Twilio console home, under Account Info: copy the **Account SID** (starts with `AC`) and the **Auth Token** (click Show).
2. On Vercel (Production), add:
   - `TWILIO_ACCOUNT_SID` = the Account SID
   - `TWILIO_AUTH_TOKEN` = the Auth Token (sensitive)
   - `TWILIO_WHATSAPP_FROM` = your quickstart sender, like `+17372508034`
   - `TWILIO_CONTENT_SID_CONFIRM` = the HX sid of the confirmation template (see below)
   - `TWILIO_CONTENT_SID_REMINDER` = the HX sid of the reminder template (optional)
   - `TWILIO_CONTENT_SID_CLINIC_ALERT` = the HX sid of the clinic alert template (optional)
   - `WHATSAPP_PUBLIC_URL` = `https://od-demo-lyart.vercel.app`
   - `WHATSAPP_PROVIDER` = `twilio` (optional; the Twilio vars alone pick it)
3. Redeploy.

If the reminder or clinic alert sid is unset, that message reuses the confirmation sid, and the server log says so.
That lets the demo run on one template, like Twilio's sample, until the custom ones are approved.
If no sid is set at all, Twilio gets plain text. That only lands inside a 24 hour session the recipient opened by messaging the sender.
Outside it, sends fail with error 63016, also shown with the hint.

Never paste the Auth Token or the Account SID in chat, code or memory files. GitHub push protection blocks Account SIDs.

### Create the content templates

1. Twilio console > Messaging > Content Template Builder > Create new.
2. Name: use the names below. Language: English.
3. Content type: **Text**.
4. Body: paste the text below, with `{{1}}` and `{{2}}` as written. Add a sample value for each.
5. Save, then **Submit for WhatsApp approval**. Category: **Utility**.
6. When it shows Approved, copy its **Content SID** (starts with `HX`) into the matching env var on Vercel. Redeploy.

The wording follows the Meta templates below. Twilio's version has two variables, so the clinic name is written in.
The code sends the variables in the order listed in `CONTENT_VARIABLES` in `lib/whatsapp/messages.ts`. Change that map if a template needs another order.

#### Booking confirmed: `lotus_booking_confirmed` → `TWILIO_CONTENT_SID_CONFIRM`

```
Hello, your visit at Lotus Women's Clinic is confirmed for {{1}}, {{2}}. Reply to this message if you need to change it.
```

Samples: {{1}} `Sat 24 Oct`, {{2}} `Morning, 10 am – 1 pm`

#### Visit reminder: `lotus_booking_reminder` → `TWILIO_CONTENT_SID_REMINDER`

```
Hello, this is a reminder from Lotus Women's Clinic. Your visit is tomorrow, {{1}}, {{2}}. Reply to this message if you need to change it.
```

Samples: same as above.

#### New booking alert (to the clinic): `lotus_new_booking_alert` → `TWILIO_CONTENT_SID_CLINIC_ALERT`

```
New booking: {{1}}, {{2}}. Open the dashboard to confirm.
```

Samples: {{1}} `Priya (Clinic visit)`, {{2}} `Sat 24 Oct, Morning, 10 am – 1 pm`

{{1}} is the patient's first name and visit type. The reason is not sent, to keep it off Twilio.

### Delivery statuses

Each send asks Twilio to post its status to the URL below, when `WHATSAPP_PUBLIC_URL` is set.
If the console offers a status callback URL for the sender, paste the same URL there, method POST:

```
https://od-demo-lyart.vercel.app/api/whatsapp/twilio-status
```

The route checks Twilio's signature with `TWILIO_AUTH_TOKEN`. The dashboard row then moves from "sent" to "delivered" or "read", and shows "via Twilio".
The message log stores the HX sid in its `template` column for content sends, and `text` for plain-text sends.

### Meta stays

The Meta route is unchanged. For a verified business, set `WHATSAPP_PROVIDER=meta` (or remove the Twilio vars) and follow the steps below.

## 1. Create three templates

Go to WhatsApp Manager > Message templates > Create template.
Create all three. Use the exact names, so the env vars below match.

### Booking confirmed

- Category: Utility
- Name: `lotus_booking_confirmed`
- Language: English (US), code `en_US`
- Body:

  ```
  Hello {{1}}, your visit at {{2}} is confirmed for {{3}}, {{4}}. Visit type: {{5}}. Reply to this message if you need to change it.
  ```

- Sample values: {{1}} `Priya`, {{2}} `Lotus Women's Clinic`, {{3}} `Sat 24 Oct`, {{4}} `Morning, 10 am – 1 pm`, {{5}} `Clinic visit`

### Visit reminder

- Category: Utility
- Name: `lotus_booking_reminder`
- Language: English (US), code `en_US`
- Body:

  ```
  Hello {{1}}, this is a reminder from {{2}}. Your visit is tomorrow, {{3}}, {{4}}. Visit type: {{5}}. Reply to this message if you need to change it.
  ```

- Sample values: same as above.

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

No header, footer or buttons. Approval usually takes minutes to a day.

When they show "Active", set these on Vercel (Production), then redeploy:

- `WHATSAPP_TEMPLATE_CONFIRM` = `lotus_booking_confirmed`
- `WHATSAPP_TEMPLATE_REMINDER` = `lotus_booking_reminder`
- `WHATSAPP_TEMPLATE_CLINIC_ALERT` = `lotus_new_booking_alert`
- `WHATSAPP_TEMPLATE_LANG` = `en_US`

Also set `CLINIC_WHATSAPP` to the clinic's own number: digits only, `91` then 10 digits, no plus.
Without it, no clinic alert is sent. While on the test number, that number must be one of the 5 verified recipients.

If Meta asks for a different wording, keep the five placeholders in the same order.
Patient templates: first name, clinic name, date, time slot, visit type.
Clinic alert: full name, visit type, date, time slot, reason.

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
