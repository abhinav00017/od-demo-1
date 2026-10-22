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
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check, ADD CONSTRAINT messages_kind_check CHECK (kind IN ('confirmation', 'reminder', 'cancellation', 'clinic_alert', 'inbound', 'patient_confirmed'));
