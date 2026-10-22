/** Today's date in the clinic's time zone (India), as YYYY-MM-DD. Servers run in UTC. */
export function clinicToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Tomorrow in the clinic's time zone, as YYYY-MM-DD. Used by the reminder job. */
export function clinicTomorrow(now: Date = new Date()): string {
  const [y, m, d] = clinicToday(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
