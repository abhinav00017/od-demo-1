-- Bookings for the Lotus demo (level 2), and the WhatsApp message log (level 3).
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS bookings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  clinic_slug text        NOT NULL,
  name        text        NOT NULL,
  phone       text        NOT NULL CHECK (phone ~ '^[6-9][0-9]{9}$'),
  visit_type  text        NOT NULL,
  date        date        NOT NULL,
  slot        text        NOT NULL,
  reason      text        NOT NULL,
  status      text        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'cancelled')),
  notes       text
);

CREATE INDEX IF NOT EXISTS bookings_clinic_date_idx ON bookings (clinic_slug, date);

-- WhatsApp message log (level 3). One row per message sent, or tried, for a booking.
-- to_masked keeps the last 4 digits only. Status moves queued, sent, delivered, read; or failed.
CREATE TABLE IF NOT EXISTS messages (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          uuid        NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  kind                text        NOT NULL CHECK (kind IN ('confirmation', 'reminder', 'cancellation', 'clinic_alert', 'inbound', 'patient_confirmed')),
  channel             text        NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp')),
  to_masked           text        NOT NULL,
  template            text        NOT NULL,
  provider_message_id text,
  status              text        NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  error               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_booking_idx ON messages (booking_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS messages_provider_id_idx ON messages (provider_message_id) WHERE provider_message_id IS NOT NULL;

-- Which provider carried each message: meta (Cloud API), twilio (WhatsApp sandbox) or fake (local dev).
-- Added with the Twilio provider. Rows sent before it were all Meta, hence the default.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'meta' CHECK (provider IN ('meta', 'twilio', 'fake'));

-- The patient tapped "Change time" on WhatsApp. Cleared when staff confirm or cancel. Added with the inbound webhook.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS wants_new_time boolean NOT NULL DEFAULT false;

-- Inbound WhatsApp messages and patient confirmations, added with the inbound webhook.
-- Replaces the kind check on tables made before it. Postgres names an inline column check <table>_<column>_check.
-- One statement, so the drop and the add happen together. Safe to rerun.
-- The CRM build added quote_sent (a quote on WhatsApp) and crm_reminder (the 2-day nudge) here, not in a second statement,
-- so a rerun never re-adds a narrower check over rows that already use the new kinds.
-- The patient-messages build added request_received (on booking) and visit_moved (staff changed the day or slot) here too.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check, ADD CONSTRAINT messages_kind_check CHECK (kind IN ('confirmation', 'reminder', 'cancellation', 'clinic_alert', 'inbound', 'patient_confirmed', 'quote_sent', 'crm_reminder', 'request_received', 'visit_moved'));

-- CRM for tile showrooms (phase 1). Every table carries shop_slug, so one database can hold several shops later.
-- Money is in paise (integer rupees * 100). Safe to rerun.
CREATE TABLE IF NOT EXISTS crm_products (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_slug      text          NOT NULL DEFAULT 'kalyani-tiles',
  sku            text          NOT NULL,
  name           text          NOT NULL,
  brand          text          NOT NULL,
  category       text          NOT NULL CHECK (category IN ('floor', 'wall', 'outdoor', 'bathroom', 'kitchen')),
  size_mm        text          NOT NULL,
  finish         text          NOT NULL,
  price_per_box  bigint        NOT NULL CHECK (price_per_box > 0),
  sqft_per_box   numeric(8, 3) NOT NULL CHECK (sqft_per_box > 0),
  pieces_per_box integer       NOT NULL CHECK (pieces_per_box > 0),
  image_url      text,
  active         boolean       NOT NULL DEFAULT true,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (shop_slug, sku)
);

CREATE TABLE IF NOT EXISTS crm_leads (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_slug         text        NOT NULL DEFAULT 'kalyani-tiles',
  name              text        NOT NULL,
  phone             text        NOT NULL CHECK (phone ~ '^[6-9][0-9]{9}$'),
  status            text        NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'customer', 'lost')),
  source            text        NOT NULL CHECK (source IN ('walk-in', 'call', 'whatsapp', 'referral')),
  notes             text        NOT NULL DEFAULT '',
  next_follow_up_at timestamptz,
  last_contact_at   timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  converted_at      timestamptz,
  UNIQUE (shop_slug, phone)
);

-- number is "<shop prefix>-<seq, 4 digits>", like KT-0001. public_key goes in the customer's link, so numbers cannot be guessed.
CREATE TABLE IF NOT EXISTS crm_quotes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_slug  text        NOT NULL DEFAULT 'kalyani-tiles',
  lead_id    uuid        NOT NULL REFERENCES crm_leads (id) ON DELETE CASCADE,
  seq        integer     NOT NULL,
  number     text        NOT NULL,
  public_key text        NOT NULL,
  status     text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'sold', 'lost')),
  subtotal   bigint      NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount   bigint      NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total      bigint      NOT NULL DEFAULT 0 CHECK (total >= 0),
  sent_at    timestamptz,
  sold_at    timestamptz,
  notes      text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_slug, seq),
  UNIQUE (shop_slug, number)
);

CREATE INDEX IF NOT EXISTS crm_quotes_lead_idx ON crm_quotes (lead_id, created_at);

CREATE TABLE IF NOT EXISTS crm_quote_items (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    uuid          NOT NULL REFERENCES crm_quotes (id) ON DELETE CASCADE,
  product_id  uuid          NOT NULL REFERENCES crm_products (id),
  position    integer       NOT NULL DEFAULT 0,
  qty_boxes   integer       NOT NULL CHECK (qty_boxes > 0),
  area_sqft   numeric(10, 2),
  wastage_pct numeric(5, 2) NOT NULL DEFAULT 10 CHECK (wastage_pct >= 0 AND wastage_pct <= 50),
  unit_price  bigint        NOT NULL CHECK (unit_price >= 0),
  line_total  bigint        NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS crm_quote_items_quote_idx ON crm_quote_items (quote_id, position);

CREATE TABLE IF NOT EXISTS crm_followups (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_slug  text        NOT NULL DEFAULT 'kalyani-tiles',
  lead_id    uuid        NOT NULL REFERENCES crm_leads (id) ON DELETE CASCADE,
  quote_id   uuid        REFERENCES crm_quotes (id) ON DELETE SET NULL,
  kind       text        NOT NULL CHECK (kind IN ('auto_whatsapp', 'call')),
  due_at     timestamptz NOT NULL,
  done_at    timestamptz,
  result     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_followups_shop_open_idx ON crm_followups (shop_slug, due_at) WHERE done_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_followups_lead_idx ON crm_followups (lead_id, created_at);

-- CRM WhatsApp sends go in the same messages table. A row belongs to a booking or to a CRM lead, so booking_id may be empty now.
ALTER TABLE IF EXISTS messages ALTER COLUMN booking_id DROP NOT NULL;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS crm_lead_id uuid REFERENCES crm_leads (id) ON DELETE CASCADE;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS crm_quote_id uuid REFERENCES crm_quotes (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_crm_lead_idx ON messages (crm_lead_id, created_at) WHERE crm_lead_id IS NOT NULL;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_owner_check, ADD CONSTRAINT messages_owner_check CHECK (booking_id IS NOT NULL OR crm_lead_id IS NOT NULL);

-- Clinic admin redesign: where each booking came from, demo rows, the visited and no-show statuses, and front-desk notes.
-- source is display only. utm holds first-touch details (utm_*, gclid, fbclid, referrer host, landing path).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'google_ads', 'meta_ads', 'google_maps', 'google_search', 'walk_in', 'phone', 'referral', 'whatsapp', 'other'));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS campaign text;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utm jsonb;

-- Sample data from the demo seed. Reset demo data deletes and rewrites only these rows.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Widens the inline status check (Postgres names it bookings_status_check) to add visited and no_show.
-- One statement, so the drop and the add happen together. Safe to rerun.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check, ADD CONSTRAINT bookings_status_check CHECK (status IN ('new', 'confirmed', 'cancelled', 'visited', 'no_show'));

-- Patient history and the Patients tab look bookings up by phone.
CREATE INDEX IF NOT EXISTS bookings_clinic_phone_idx ON bookings (clinic_slug, phone);

-- Front-desk notes on a patient, one per clinic and phone.
CREATE TABLE IF NOT EXISTS patient_notes (
  clinic_slug text        NOT NULL,
  phone       text        NOT NULL,
  notes       text        NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_slug, phone)
);

-- Patient messages build (10 Nov 2026): the patient's private page, visit moved, No WhatsApp, opt-out and consent records.
-- Every statement is safe to rerun.

-- The patient's private link /clinic/website/v/<view_token>. The app writes 24 url-safe characters on create.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS view_token text;

-- Rows from before the patient page get a token too (64 hex characters, two random uuids), so their links work.
UPDATE bookings SET view_token = translate(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') WHERE view_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_view_token_idx ON bookings (view_token) WHERE view_token IS NOT NULL;

-- Staff moved the visit and asked the patient to confirm on WhatsApp. Cleared when the patient taps Confirm.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS awaiting_patient boolean NOT NULL DEFAULT false;

-- A WhatsApp send came back "not on WhatsApp" (Meta 131026, Twilio 63024 or 63003). Staff call instead.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_whatsapp boolean NOT NULL DEFAULT false;

-- When staff marked a No-WhatsApp booking "Confirmed by phone".
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone_confirmed_at timestamptz;

-- The day and slot the patient asked for on their page (with wants_new_time).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requested_date date;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requested_slot text;

-- WhatsApp consent: when, the exact line shown, and where (website form, or staff with "Send on WhatsApp" ticked).
-- All null = no consent, and the booking never gets a WhatsApp message.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consent_at timestamptz;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consent_text text;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consent_source text CHECK (consent_source IN ('website', 'staff'));

-- Website bookings made before consent records all ticked the old consent checkbox (the API refused them without it),
-- so they keep getting WhatsApp. Only rows whose token came from the backfill above (64 characters; the app writes 24),
-- so a rerun never gives consent to a later staff booking. Staff sources stay without consent. Real rows only.
UPDATE bookings SET consent_at = created_at, consent_text = 'The clinic may message me on WhatsApp about this visit.', consent_source = 'website'
WHERE consent_source IS NULL AND is_demo = false AND length(view_token) = 64 AND source IN ('website', 'google_ads', 'meta_ads', 'google_maps', 'google_search', 'whatsapp');

-- Phones (10 digits) that sent STOP. Every send checks this first. START removes the row.
CREATE TABLE IF NOT EXISTS whatsapp_optouts (
  phone        text        PRIMARY KEY,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  source       text        NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'staff', 'demo'))
);

-- Phones (10 digits) that are not on WhatsApp, so later bookings skip WhatsApp and staff call instead.
CREATE TABLE IF NOT EXISTS whatsapp_unreachable (
  phone     text        PRIMARY KEY,
  marked_at timestamptz NOT NULL DEFAULT now(),
  reason    text
);
