import { describe, expect, it } from "vitest";
import { confirmationMessage, normalisePhone, validateBooking, type BookingInput } from "@/demos/lotus-clinic/booking";

// Monday 20 Oct 2026. Sunday is 25 Oct.
const today = new Date(2026, 9, 20, 15, 0);
const good: BookingInput = {
  name: "Priya Sharma",
  phone: "+91 98765 43210",
  visitType: "clinic",
  date: "2026-10-22",
  slot: "Morning, 10 am – 1 pm",
  reason: "Pregnancy care",
  consent: true,
};

describe("booking validation", () => {
  it("accepts a complete request", () => {
    expect(validateBooking(good, today)).toEqual({});
  });

  it("flags every empty field", () => {
    const errors = validateBooking({ name: "", phone: "", visitType: "", date: "", slot: "", reason: "", consent: false }, today);
    expect(Object.keys(errors).sort()).toEqual(["consent", "date", "name", "phone", "reason", "slot", "visitType"]);
  });

  it("checks the phone number", () => {
    expect(normalisePhone("98765 43210")).toBe("9876543210");
    expect(normalisePhone("09876543210")).toBe("9876543210");
    expect(normalisePhone("12345")).toBeUndefined();
    expect(validateBooking({ ...good, phone: "5876543210" }, today).phone).toMatch(/10-digit/);
  });

  it("allows today, refuses the past and far-off dates", () => {
    expect(validateBooking({ ...good, date: "2026-10-20" }, today).date).toBeUndefined();
    expect(validateBooking({ ...good, date: "2026-10-19" }, today).date).toMatch(/today or a later date/);
    expect(validateBooking({ ...good, date: "2027-03-01" }, today).date).toMatch(/next 60 days/);
  });

  it("refuses a Sunday clinic visit but allows a Sunday online consultation", () => {
    expect(validateBooking({ ...good, date: "2026-10-25" }, today).date).toMatch(/closed on Sundays/);
    expect(validateBooking({ ...good, date: "2026-10-25", visitType: "online" }, today).date).toBeUndefined();
  });

  it("builds the WhatsApp confirmation with the first name, type, day and time", () => {
    expect(confirmationMessage(good)).toBe(
      "Hi Priya, thank you for booking with Lotus Women's Clinic. We have your request for a clinic visit on Thu, 22 Oct, morning. We will confirm the exact time here within 2 hours.",
    );
    expect(confirmationMessage({ ...good, visitType: "online", slot: "Evening, 5 pm – 7 pm" })).toContain("for an online consultation on Thu, 22 Oct, evening.");
  });
});
