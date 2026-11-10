import { clinic } from "./data";

/**
 * Clock hours (clinic time, India) of each slot window, in the order of clinic.booking.slots:
 * Morning 10 am – 1 pm, Afternoon 2 pm – 5 pm, Evening 5 pm – 7 pm.
 */
const SLOT_HOURS: readonly [number, number][] = [
  [10, 13],
  [14, 17],
  [17, 19],
];

/** The start and end hour of a slot, or the whole clinic day for an unknown slot. */
export function slotHours(slot: string): [number, number] {
  const i = (clinic.booking.slots as readonly string[]).indexOf(slot);
  return SLOT_HOURS[i] ?? [10, 19];
}

/** "20261112T043000Z": a clinic-time (UTC+5:30) day and hour as an iCalendar UTC stamp. */
function utcStamp(day: string, hour: number) {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hour, 0) - 330 * 60 * 1000);
  return t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapes iCalendar TEXT: backslash, semicolon, comma and new lines. */
const text = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** A one-event .ics file for the visit, built in the browser. No name, phone or reason in it. */
export function visitIcs(v: { date: string; slot: string; visitType: string }, now: Date = new Date()) {
  const [start, end] = slotHours(v.slot);
  const online = v.visitType === "online";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//onlydevs//Lotus demo//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${v.date}-${start}@lotus-clinic.demo`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${utcStamp(v.date, start)}`,
    `DTEND:${utcStamp(v.date, end)}`,
    `SUMMARY:${text(`${online ? "Online consultation" : "Visit"}, ${clinic.name}`)}`,
    online ? `DESCRIPTION:${text("The clinic sends the call link on WhatsApp.")}` : `LOCATION:${text(clinic.address.join(", "))}`,
    ...(online ? [] : [`DESCRIPTION:${text(`Come any time in this window: ${v.slot}.`)}`]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}
