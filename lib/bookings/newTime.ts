import { MAX_DAYS_AHEAD, parseDay } from "@/demos/lotus-clinic/booking";
import { clinic } from "@/demos/lotus-clinic/data";

/**
 * Checks a new day and slot for a booking: today or later (and, for patients, within the booking window),
 * a real slot, and no clinic visits on Sundays. Returns the error to show, or null.
 */
export function newTimeError(date: unknown, slot: unknown, visitType: string, today: string, opts: { maxDaysAhead?: number } = {}) {
  const day = typeof date === "string" ? parseDay(date) : undefined;
  if (!day || typeof date !== "string" || date < today) return "Choose today or a later date.";
  if (opts.maxDaysAhead !== undefined) {
    const last = parseDay(today)!;
    last.setDate(last.getDate() + opts.maxDaysAhead);
    if (day > last) return `Choose a date in the next ${opts.maxDaysAhead} days.`;
  }
  if (day.getDay() === 0 && visitType === "clinic") return "The clinic is closed on Sundays. Choose another day.";
  if (typeof slot !== "string" || !(clinic.booking.slots as readonly string[]).includes(slot)) return "Choose a time of day.";
  return null;
}

export { MAX_DAYS_AHEAD };
