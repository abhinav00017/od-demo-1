import type { Booking, BookingStatus } from "./types";

/** What the patient's own page may see of a booking. No name, phone, reason, notes, source or ids. */
export type PublicVisit = {
  date: string;
  slot: string;
  visitType: string;
  status: BookingStatus;
  /** The patient asked for another day or slot, and the clinic has not answered yet. */
  wantsNewTime: boolean;
  requestedDate: string | null;
  requestedSlot: string | null;
  /** The clinic moved the visit and is waiting for the patient to confirm. */
  awaitingPatient: boolean;
};

export function publicVisit(b: Booking): PublicVisit {
  return {
    date: b.date,
    slot: b.slot,
    visitType: b.visitType,
    status: b.status,
    wantsNewTime: b.wantsNewTime,
    requestedDate: b.requestedDate,
    requestedSlot: b.requestedSlot,
    awaitingPatient: b.awaitingPatient,
  };
}
