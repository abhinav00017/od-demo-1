/**
 * The patient's private link token: /clinic/website/v/<token>. 18 random bytes as base64url = 24 url-safe characters
 * (144 bits), so links cannot be guessed. Rows made before this build get 64 hex characters from the migration.
 */
export const VIEW_TOKEN_BYTES = 18;

const TOKEN = /^[A-Za-z0-9_-]{22,128}$/;

export function newViewToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(VIEW_TOKEN_BYTES));
  return Buffer.from(bytes).toString("base64url");
}

/** True for a string shaped like a token. Anything else is refused before the store is asked. */
export function isViewToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN.test(value);
}

/** The patient page for a token, on a site origin like https://od-demo-lyart.vercel.app. */
export function patientPageUrl(origin: string, token: string) {
  return `${origin.replace(/\/+$/, "")}/clinic/website/v/${encodeURIComponent(token)}`;
}

/** The path part, for the Twilio URL-button suffix and the docs. */
export const PATIENT_PAGE_PATH = "/clinic/website/v/";
