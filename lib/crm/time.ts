/**
 * Day boundaries in shop time (India). Servers run in UTC, and "due today" means today at the counter.
 * No Node imports: the screens use these too.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD in India. */
export function shopDay(now: Date = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight in India at the start of `day` (YYYY-MM-DD), as a Date. */
export function startOfShopDay(day: string) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS);
}

/** Midnight in India at the end of today: anything due before it is due today (or overdue). */
export function endOfShopToday(now: Date = new Date()) {
  return new Date(startOfShopDay(shopDay(now)).getTime() + DAY_MS);
}

/** Monday 00:00 in India of the current week. */
export function startOfShopWeek(now: Date = new Date()) {
  const start = startOfShopDay(shopDay(now));
  const weekday = new Date(Date.parse(`${shopDay(now)}T00:00:00Z`)).getUTCDay(); // 0 Sunday
  const back = (weekday + 6) % 7;
  return new Date(start.getTime() - back * DAY_MS);
}

/** The 1st of this month, 00:00 in India. */
export function startOfShopMonth(now: Date = new Date()) {
  return startOfShopDay(`${shopDay(now).slice(0, 8)}01`);
}

export function addDays(at: Date | string, days: number) {
  return new Date(new Date(at).getTime() + days * DAY_MS);
}

export { DAY_MS };
