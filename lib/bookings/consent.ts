/**
 * The WhatsApp consent lines, kept in one place. The booking form shows the website line under its button and the
 * API stores exactly that text with each booking. Change the wording by adding a new version, never by editing one:
 * stored rows keep the text the patient actually saw.
 */
export const CONSENT_SOURCES = ["website", "staff"] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

/** Version 1 of the website line, shown under "Request appointment" from 10 Nov 2026. */
export const CONSENT_TEXT_V1 = "By booking, you agree that Lotus Women's Clinic may message you on WhatsApp about this visit.";

/** Version 1 of the staff line, next to the "Send on WhatsApp" tick in the New booking dialog. */
export const STAFF_CONSENT_TEXT_V1 = "The patient agreed to get WhatsApp messages about this visit.";

/** The checkbox the booking form had before 10 Nov 2026. The migration stores it on website bookings made before consent records. */
export const CONSENT_TEXT_LEGACY_CHECKBOX = "The clinic may message me on WhatsApp about this visit.";

/** The lines in use now. */
export const CONSENT_TEXT = { website: CONSENT_TEXT_V1, staff: STAFF_CONSENT_TEXT_V1 } as const satisfies Record<ConsentSource, string>;

/** What a booking stores about consent. All three are null when there is none. */
export type Consent = { at: string; text: string; source: ConsentSource };

export function consentNow(source: ConsentSource, now: Date = new Date()): Consent {
  return { at: now.toISOString(), text: CONSENT_TEXT[source], source };
}
