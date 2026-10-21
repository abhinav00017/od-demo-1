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
export function groupByDay(bookings: Booking[]) {
  const days = new Map<string, Booking[]>();
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
