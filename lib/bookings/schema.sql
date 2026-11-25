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

-- Organizations and Ogi's safety base (15 Nov 2026, docs/ogi-database-design.html). Every client is an organization
-- with a fixed id. Every table says which organization owns each row in org_id, and the database fills it itself:
-- from the slug, the quote, or the booking or lead. Ogi, the onlydevs bot, reads only through ogi_bot: a read-only
-- role with no login, which row-level security limits to one organization at a time. The app's own role owns these
-- tables and RLS is not forced, so the app reads and writes exactly as before. Every statement is safe to rerun.

-- One row per client. The id never changes and is what the lock uses. The slug only names web addresses: renaming it
-- changes no row's org_id. product is which onlydevs product the client uses (clinic, tiles, ...).
CREATE TABLE IF NOT EXISTS organizations (
  id         text        PRIMARY KEY,
  slug       text        NOT NULL UNIQUE,
  name       text        NOT NULL,
  product    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The demo organizations. lib/orgs.ts lists the same rows; a test checks they match.
-- The Solstice cafe was added with event enquiries (25 Nov 2026). On a database that already has the first two,
-- a rerun inserts only the new row.
INSERT INTO organizations (id, slug, name, product) VALUES
  ('org_7f3k2a', 'lotus-clinic', 'Lotus Women''s Clinic', 'clinic'),
  ('org_2m9qd1', 'kalyani-tiles', 'Kalyani Tiles', 'tiles'),
  ('org_4v8c1n', 'solstice-cafe', 'Solstice Roastery & Bakehouse', 'cafe')
ON CONFLICT DO NOTHING;

-- org_id on every table. Empty at first on tables that have rows; the backfill below fills it, then it becomes NOT NULL.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations (id);

ALTER TABLE patient_notes ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations (id);

ALTER TABLE crm_products ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations (id);

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations (id);

ALTER TABLE crm_quotes ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations (id);

ALTER TABLE crm_followups ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations (id);

ALTER TABLE crm_quote_items ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations (id);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS org_id text REFERENCES organizations (id);

-- The STOP list and the no-WhatsApp list have no slug and no parent row. They belong to Lotus for now.
-- Open question for Abhinav: should each organization keep its own lists? Their keys stay phone only until he decides.
ALTER TABLE whatsapp_optouts ADD COLUMN IF NOT EXISTS org_id text NOT NULL DEFAULT 'org_7f3k2a' REFERENCES organizations (id);

ALTER TABLE whatsapp_unreachable ADD COLUMN IF NOT EXISTS org_id text NOT NULL DEFAULT 'org_7f3k2a' REFERENCES organizations (id);

-- Tables with a slug (clinic_slug or shop_slug, named by the trigger's argument) take the organization with that slug.
-- An unknown slug is an error, so no row is ever stored without an organization. An update that keeps the slug keeps
-- the organization, whatever the update says about org_id; so after a client renames its slug, old rows keep their
-- org_id and only new rows need the new slug.
CREATE OR REPLACE FUNCTION org_id_from_slug() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  new_slug text := to_jsonb(NEW) ->> TG_ARGV[0];
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.org_id IS NOT NULL AND new_slug IS NOT DISTINCT FROM (to_jsonb(OLD) ->> TG_ARGV[0]) THEN
    NEW.org_id := OLD.org_id;
    RETURN NEW;
  END IF;
  NEW.org_id := (SELECT id FROM organizations WHERE slug = new_slug);
  IF NEW.org_id IS NULL THEN
    RAISE EXCEPTION 'no organization has this %.%', TG_TABLE_NAME, TG_ARGV[0] USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE TRIGGER bookings_org_id BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION org_id_from_slug('clinic_slug');

CREATE OR REPLACE TRIGGER patient_notes_org_id BEFORE INSERT OR UPDATE ON patient_notes
FOR EACH ROW EXECUTE FUNCTION org_id_from_slug('clinic_slug');

CREATE OR REPLACE TRIGGER crm_products_org_id BEFORE INSERT OR UPDATE ON crm_products
FOR EACH ROW EXECUTE FUNCTION org_id_from_slug('shop_slug');

CREATE OR REPLACE TRIGGER crm_leads_org_id BEFORE INSERT OR UPDATE ON crm_leads
FOR EACH ROW EXECUTE FUNCTION org_id_from_slug('shop_slug');

CREATE OR REPLACE TRIGGER crm_quotes_org_id BEFORE INSERT OR UPDATE ON crm_quotes
FOR EACH ROW EXECUTE FUNCTION org_id_from_slug('shop_slug');

CREATE OR REPLACE TRIGGER crm_followups_org_id BEFORE INSERT OR UPDATE ON crm_followups
FOR EACH ROW EXECUTE FUNCTION org_id_from_slug('shop_slug');

-- A quote item always takes its quote's organization, whatever the insert or update says.
CREATE OR REPLACE FUNCTION crm_quote_items_org_id() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.org_id := (SELECT org_id FROM crm_quotes WHERE id = NEW.quote_id);
  IF NEW.org_id IS NULL THEN
    RAISE EXCEPTION 'a quote item needs a quote with an organization' USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE TRIGGER crm_quote_items_org_id BEFORE INSERT OR UPDATE ON crm_quote_items
FOR EACH ROW EXECUTE FUNCTION crm_quote_items_org_id();

-- CRM sends share the messages table with clinic sends. A message always takes its CRM lead's organization, or else
-- its booking's, whatever the insert or update says. A message with neither is left to the NOT NULL and owner checks.
CREATE OR REPLACE FUNCTION messages_org_id() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.crm_lead_id IS NOT NULL THEN
    NEW.org_id := (SELECT org_id FROM crm_leads WHERE id = NEW.crm_lead_id);
  ELSIF NEW.booking_id IS NOT NULL THEN
    NEW.org_id := (SELECT org_id FROM bookings WHERE id = NEW.booking_id);
  ELSE
    RETURN NEW;
  END IF;
  IF NEW.org_id IS NULL THEN
    RAISE EXCEPTION 'a message needs a booking or CRM lead with an organization' USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE TRIGGER messages_org_id BEFORE INSERT OR UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION messages_org_id();

-- Backfill rows from before org_id, parents first. Slug tables touch only rows still empty (a filled row keeps its
-- organization, even after a slug rename). Quote items and messages touch only rows that differ from their parent.
-- A row whose slug matches no organization stays empty, and SET NOT NULL below then stops the migration.
UPDATE bookings SET org_id = organizations.id FROM organizations
WHERE bookings.org_id IS NULL AND organizations.slug = bookings.clinic_slug;

UPDATE patient_notes SET org_id = organizations.id FROM organizations
WHERE patient_notes.org_id IS NULL AND organizations.slug = patient_notes.clinic_slug;

UPDATE crm_products SET org_id = organizations.id FROM organizations
WHERE crm_products.org_id IS NULL AND organizations.slug = crm_products.shop_slug;

UPDATE crm_leads SET org_id = organizations.id FROM organizations
WHERE crm_leads.org_id IS NULL AND organizations.slug = crm_leads.shop_slug;

UPDATE crm_quotes SET org_id = organizations.id FROM organizations
WHERE crm_quotes.org_id IS NULL AND organizations.slug = crm_quotes.shop_slug;

UPDATE crm_followups SET org_id = organizations.id FROM organizations
WHERE crm_followups.org_id IS NULL AND organizations.slug = crm_followups.shop_slug;

UPDATE crm_quote_items SET org_id = crm_quotes.org_id FROM crm_quotes
WHERE crm_quote_items.quote_id = crm_quotes.id AND crm_quote_items.org_id IS DISTINCT FROM crm_quotes.org_id;

UPDATE messages SET org_id = crm_leads.org_id FROM crm_leads
WHERE messages.crm_lead_id = crm_leads.id AND messages.org_id IS DISTINCT FROM crm_leads.org_id;

UPDATE messages SET org_id = bookings.org_id FROM bookings
WHERE messages.crm_lead_id IS NULL AND messages.booking_id = bookings.id AND messages.org_id IS DISTINCT FROM bookings.org_id;

ALTER TABLE bookings ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE patient_notes ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE crm_products ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE crm_leads ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE crm_quotes ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE crm_followups ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE crm_quote_items ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE messages ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_org_idx ON bookings (org_id);

CREATE INDEX IF NOT EXISTS messages_org_idx ON messages (org_id);

CREATE INDEX IF NOT EXISTS patient_notes_org_idx ON patient_notes (org_id);

CREATE INDEX IF NOT EXISTS whatsapp_optouts_org_idx ON whatsapp_optouts (org_id);

CREATE INDEX IF NOT EXISTS whatsapp_unreachable_org_idx ON whatsapp_unreachable (org_id);

CREATE INDEX IF NOT EXISTS crm_products_org_idx ON crm_products (org_id);

CREATE INDEX IF NOT EXISTS crm_leads_org_idx ON crm_leads (org_id);

CREATE INDEX IF NOT EXISTS crm_quotes_org_idx ON crm_quotes (org_id);

CREATE INDEX IF NOT EXISTS crm_quote_items_org_idx ON crm_quote_items (org_id);

CREATE INDEX IF NOT EXISTS crm_followups_org_idx ON crm_followups (org_id);

-- Cafe event enquiries (25 Nov 2026): a visitor asks to book The Courtyard or The Conservatory for a party or a
-- small function. The cafe owner sees them in a password-protected list and moves them new, contacted, confirmed or
-- declined. org_id comes from cafe_slug through the same trigger as the other slug tables, so code never sets it.
-- A new table, so org_id is NOT NULL from the start. guests is capped at 40, the larger venue's capacity; the API
-- checks each venue's own range. Every statement is safe to rerun.
CREATE TABLE IF NOT EXISTS cafe_event_enquiries (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  cafe_slug         text        NOT NULL,
  org_id            text        NOT NULL REFERENCES organizations (id),
  venue             text        NOT NULL CHECK (venue IN ('courtyard', 'conservatory')),
  event_type        text        NOT NULL CHECK (event_type IN ('birthday', 'small_function', 'corporate', 'other')),
  date              date        NOT NULL,
  slot              text        NOT NULL,
  guests            integer     NOT NULL CHECK (guests BETWEEN 1 AND 40),
  name              text        NOT NULL,
  phone             text        NOT NULL CHECK (phone ~ '^[6-9][0-9]{9}$'),
  notes             text        NOT NULL DEFAULT '',
  status            text        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'confirmed', 'declined')),
  status_updated_at timestamptz,
  -- Where the visitor first came from (first-touch attribution, as on bookings). Display only. The public form and
  -- Ogi may only claim these sources; anything else becomes website.
  source            text        NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'google_ads', 'meta_ads', 'google_maps', 'google_search', 'whatsapp')),
  campaign          text,
  utm               jsonb,
  -- How it was sent: the venue page's form, or Ogi's Confirm button.
  channel           text        NOT NULL DEFAULT 'form' CHECK (channel IN ('form', 'ogi')),
  -- Sample data from the demo seed. The seed deletes and rewrites only these rows.
  is_demo           boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS cafe_event_enquiries_slug_created_idx ON cafe_event_enquiries (cafe_slug, created_at);

CREATE INDEX IF NOT EXISTS cafe_event_enquiries_org_idx ON cafe_event_enquiries (org_id);

CREATE OR REPLACE TRIGGER cafe_event_enquiries_org_id BEFORE INSERT OR UPDATE ON cafe_event_enquiries
FOR EACH ROW EXECUTE FUNCTION org_id_from_slug('cafe_slug');

-- Cafe orders (25 Nov 2026): orders from the website's order tray (saved before WhatsApp opens), plus sample WhatsApp
-- and walk-in orders from the demo seed. Owner Ogi reads them, read-only, for best sellers and sales.
-- items is a jsonb array of {id, name, category, qty, unitPrice}: an order is written once and never edited, the menu
-- lives in code (demos/solstice-cafe/data.ts) not in a table, and every read wants the whole order, so one row per order
-- is simpler than an order_items table. The server copies name and unit price from the menu and works out item_count
-- and total itself; the browser's prices are never read. org_id comes from cafe_slug through the same trigger.
CREATE TABLE IF NOT EXISTS cafe_orders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  cafe_slug   text        NOT NULL,
  org_id      text        NOT NULL REFERENCES organizations (id),
  channel     text        NOT NULL CHECK (channel IN ('website', 'whatsapp', 'walk_in')),
  items       jsonb       NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 20),
  item_count  integer     NOT NULL CHECK (item_count BETWEEN 1 AND 400),
  -- Rupees, incl. GST.
  total       integer     NOT NULL CHECK (total >= 0),
  fulfilment  text        CHECK (fulfilment IN ('pickup', 'delivery')),
  name        text,
  phone       text        CHECK (phone ~ '^[6-9][0-9]{9}$'),
  -- First-touch source of a website order, as on enquiries. Display only.
  source      text        CHECK (source IN ('website', 'google_ads', 'meta_ads', 'google_maps', 'google_search', 'whatsapp')),
  -- Sample data from the demo seed. The seed deletes and rewrites only these rows.
  is_demo     boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS cafe_orders_slug_created_idx ON cafe_orders (cafe_slug, created_at);

CREATE INDEX IF NOT EXISTS cafe_orders_org_idx ON cafe_orders (org_id);

CREATE OR REPLACE TRIGGER cafe_orders_org_id BEFORE INSERT OR UPDATE ON cafe_orders
FOR EACH ROW EXECUTE FUNCTION org_id_from_slug('cafe_slug');

-- The bot's role. NOLOGIN: it has no password and nobody can connect as it. The app switches to it per transaction.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ogi_bot') THEN
    CREATE ROLE ogi_bot NOLOGIN;
  ELSE
    ALTER ROLE ogi_bot NOLOGIN;
  END IF;
END
$$;

-- Lets the app's role run SET LOCAL ROLE ogi_bot. On Postgres 16+ the creator's automatic grant cannot SET, so this is needed.
GRANT ogi_bot TO CURRENT_USER;

-- For every table: stop if the app's role does not own it (RLS would then hide rows from the app itself), give ogi_bot
-- SELECT and nothing else, turn RLS on without FORCE, and let ogi_bot see only rows of the organization set for the
-- transaction. With app.org_id unset or empty, ogi_bot sees no rows at all. ogi_bot gets nothing on organizations.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bookings', 'messages', 'patient_notes', 'whatsapp_optouts', 'whatsapp_unreachable', 'crm_products', 'crm_leads', 'crm_quotes', 'crm_quote_items', 'crm_followups', 'cafe_event_enquiries', 'cafe_orders'] LOOP
    IF NOT pg_has_role(current_user, (SELECT relowner FROM pg_class WHERE oid = t::regclass), 'USAGE') THEN
      RAISE EXCEPTION 'table % is not owned by %, so row-level security would hide its rows from the app', t, current_user;
    END IF;
    EXECUTE format('REVOKE ALL ON %I FROM ogi_bot', t);
    EXECUTE format('GRANT SELECT ON %I TO ogi_bot', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS ogi_bot_read ON %I', t);
    EXECUTE format('CREATE POLICY ogi_bot_read ON %I FOR SELECT TO ogi_bot USING (org_id = NULLIF(current_setting(%L, true), %L))', t, 'app.org_id', '');
  END LOOP;
END
$$;
