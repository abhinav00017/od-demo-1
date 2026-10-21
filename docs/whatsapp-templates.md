# WhatsApp setup for the Lotus demo

The code sends WhatsApp messages through Meta's Cloud API.
Until the two templates below are approved, it sends Meta's `hello_world` template instead.
The server log shows what the real template would have said.

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

## Test number limits

The test number +1 (555) 672-3191 only sends to up to 5 numbers you verify on the API Setup page.
Real clinic numbers need Meta business verification first.
