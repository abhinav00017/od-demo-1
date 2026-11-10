import type { Booking } from "@/lib/bookings/types";
import { formatDay, parseDay } from "./booking";
import { clinic } from "./data";

/** "9876543210" -> "98••• ••210". The clinic taps to see the full number. */
export function maskPhone(phone: string) {
  return phone.length === 10 ? `${phone.slice(0, 2)}••• ••${phone.slice(7)}` : "••••••••••";
}

export function formatPhone(phone: string) {
  return phone.length === 10 ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

function addDays(day: string, n: number) {
  const d = parseDay(day);
  if (!d) return day;
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Sunday of the week that holds `today` (weeks run Monday to Sunday). */
export function endOfWeek(today: string) {
  const d = parseDay(today);
  return d ? addDays(today, (7 - d.getDay()) % 7) : today;
}

export function dayLabel(day: string, today: string) {
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  const d = parseDay(day);
  return d ? formatDay(d) : day;
}

const slotRank = (slot: string) => {
  const i = (clinic.booking.slots as readonly string[]).indexOf(slot);
  return i < 0 ? 99 : i;
};

/** Groups bookings by day, earliest first. Inside a day: morning, afternoon, evening, then by arrival. */
export function groupByDay<T extends Booking>(bookings: T[]) {
  const days = new Map<string, T[]>();
  for (const b of [...bookings].sort((a, b) => a.date.localeCompare(b.date) || slotRank(a.slot) - slotRank(b.slot) || a.createdAt.localeCompare(b.createdAt))) {
    days.set(b.date, [...(days.get(b.date) ?? []), b]);
  }
  return [...days].map(([day, items]) => ({ day, items }));
}

/** Header counts. Cancelled bookings do not count toward today or this week. */
export function dashboardCounts(bookings: Booking[], today: string) {
  const weekEnd = endOfWeek(today);
  const live = bookings.filter((b) => b.status !== "cancelled");
  return {
    today: live.filter((b) => b.date === today).length,
    week: live.filter((b) => b.date >= today && b.date <= weekEnd).length,
    fresh: bookings.filter((b) => b.status === "new").length,
  };
}

/** YYYY-MM-DD `n` days after `day` (n may be negative). */
export function shiftDay(day: string, n: number) {
  return addDays(day, n);
}

type Waiting = Pick<Booking, "status" | "wantsNewTime"> & Partial<Pick<Booking, "noWhatsApp" | "phoneConfirmedAt" | "date">>;

/** A No-WhatsApp booking staff still have to call: open, from `today` on (when given), not confirmed by phone yet. */
export function needsCall(b: Waiting, today?: string) {
  return b.noWhatsApp === true && (b.status === "new" || b.status === "confirmed") && !b.phoneConfirmedAt && (!today || !b.date || b.date >= today);
}

/** True when the booking needs staff: a new request (any day), a patient who asked for a new time, or No WhatsApp to call. */
export function needsAction(b: Waiting, today?: string) {
  return b.status === "new" || b.wantsNewTime || needsCall(b, today);
}

/** Tomorrow's confirmed visits whose patients are not on WhatsApp: the reminder job skips them, so staff call. */
export function callToRemind<T extends Booking>(bookings: T[], today: string) {
  const tomorrow = addDays(today, 1);
  return bookings.filter((b) => b.date === tomorrow && b.status === "confirmed" && b.noWhatsApp);
}

/** "tel:+919876543210" for the Call button. */
export function telHref(phone: string) {
  return `tel:+91${phone}`;
}

/**
 * The search box: a name that contains the text (any case), or a phone that contains the digits typed
 * (so the last 4 digits find a patient). Empty matches everything.
 */
export function matchesQuery(b: Pick<Booking, "name" | "phone">, q: string) {
  const text = q.trim().toLowerCase();
  if (!text) return true;
  const digits = text.replace(/\D/g, "");
  if (b.name.toLowerCase().includes(text)) return true;
  return digits.length >= 2 && digits.length === text.replace(/[\s+-]/g, "").length && b.phone.includes(digits.replace(/^91(?=\d{10}$)/, ""));
}

/** The four count cards. Cancelled bookings never count toward today or this week. */
export function adminCounts(bookings: Booking[], waiting: Booking[], today: string) {
  const weekEnd = endOfWeek(today);
  const live = bookings.filter((b) => b.status !== "cancelled");
  return {
    needsAction: waiting.length,
    today: live.filter((b) => b.date === today).length,
    visitedToday: bookings.filter((b) => b.date === today && b.status === "visited").length,
    week: live.filter((b) => b.date >= today && b.date <= weekEnd).length,
  };
}

/** Bookings from tomorrow to 7 days out. */
export function upcomingWeek<T extends Booking>(bookings: T[], today: string) {
  const last = addDays(today, 7);
  return bookings.filter((b) => b.date > today && b.date <= last);
}

/** Groups by day, newest day first; inside a day, morning first. For the Past tab. */
export function groupByDayNewest<T extends Booking>(bookings: T[]) {
  return groupByDay(bookings).reverse();
}

/** "LP" for "Lakshmi Prasanna Varma": first and last word. */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

/** "Thu, 12 Nov" from YYYY-MM-DD. */
export function shortDay(day: string) {
  const d = parseDay(day);
  return d ? formatDay(d) : day;
}

/** "12 Nov 2026" from YYYY-MM-DD. */
export function longDay(day: string) {
  const d = parseDay(day);
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : day;
}
