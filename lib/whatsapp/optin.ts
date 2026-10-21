/**
 * The WhatsApp join step for Twilio's quickstart sender.
 * A recipient must first send "join <keyword>" to the sender, or sends to them fail.
 * The booking page and the dashboard show a link that opens WhatsApp with that message typed in.
 *
 * Meta, the fake sender and a verified Twilio sender need no join step: leave TWILIO_JOIN_KEYWORD unset and this returns null.
 * Neither value is a secret. Server components read them and pass the result down as a prop, never through NEXT_PUBLIC_ vars.
 */
import { providerName } from "./index";

type Env = Record<string, string | undefined>;

export type WhatsAppOptIn = {
  /** https://wa.me/<sender digits>?text=join%20<keyword> */
  href: string;
  keyword: string;
  /** The sender as people read it, like "+1 737 250 8034". */
  displayNumber: string;
};

/** "17372508034" -> "+1 737 250 8034", "919876543210" -> "+91 98765 43210". Other countries: "+" and the digits. */
export function displayWhatsAppNumber(digits: string) {
  if (digits.length === 11 && digits.startsWith("1")) return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return `+${digits}`;
}

/** The join link, or null when there is no join step: provider is not Twilio, or TWILIO_WHATSAPP_FROM or TWILIO_JOIN_KEYWORD is unset. */
export function whatsappOptIn(env: Env = process.env): WhatsAppOptIn | null {
  if (providerName(env) !== "twilio") return null;
  const digits = (env.TWILIO_WHATSAPP_FROM ?? "").replace(/^whatsapp:/, "").replace(/\D/g, "");
  const keyword = (env.TWILIO_JOIN_KEYWORD ?? "").trim();
  if (!digits || !keyword) return null;
  return {
    href: `https://wa.me/${digits}?text=${encodeURIComponent(`join ${keyword}`)}`,
    keyword,
    displayNumber: displayWhatsAppNumber(digits),
  };
}
