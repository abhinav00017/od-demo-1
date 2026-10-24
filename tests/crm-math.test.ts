// @vitest-environment node
import { describe, expect, it } from "vitest";
import { areaWithWastage, boxesForArea, coverage, firstName, formatInr, formatPhone, lineBoxes, quoteNumber, quoteTotals, rupeesToPaise, validUntil } from "@/lib/crm/math";
import { addDays, endOfShopToday, shopDay, startOfShopMonth, startOfShopWeek } from "@/lib/crm/time";

describe("sq ft to boxes", () => {
  it("adds wastage, divides by sq ft per box and rounds up", () => {
    // 120 sq ft + 10% = 132 sq ft; 132 / 15.5 = 8.52 -> 9 boxes.
    expect(areaWithWastage(120, 10)).toBe(132);
    expect(boxesForArea(120, 10, 15.5)).toBe(9);
    // 420 + 10% = 462; 462 / 15.5 = 29.8 -> 30.
    expect(boxesForArea(420, 10, 15.5)).toBe(30);
  });

  it("does not add a box for float noise when the area fits exactly", () => {
    // 100 * 1.1 is 110.00000000000001 in floating point; 110 / 11 must be 10 boxes, not 11.
    expect(100 * 1.1).not.toBe(110);
    expect(boxesForArea(100, 10, 11)).toBe(10);
    expect(boxesForArea(155, 0, 15.5)).toBe(10);
  });

  it("needs at least one box, and none for no area", () => {
    expect(boxesForArea(1, 0, 15.5)).toBe(1);
    expect(boxesForArea(0, 10, 15.5)).toBe(0);
    expect(boxesForArea(50, 10, 0)).toBe(0);
  });

  it("uses the area when a line has one, else the boxes typed", () => {
    expect(lineBoxes({ areaSqft: 120, wastagePct: 10, qtyBoxes: 2 }, 15.5)).toBe(9);
    expect(lineBoxes({ qtyBoxes: 4 }, 15.5)).toBe(4);
    expect(lineBoxes({ qtyBoxes: 4.7 }, 15.5)).toBe(4);
    expect(lineBoxes({ areaSqft: null, qtyBoxes: 3 }, 15.5)).toBe(3);
    // Wastage defaults to 10%.
    expect(lineBoxes({ areaSqft: 120 }, 15.5)).toBe(9);
  });

  it("works out the sq ft boxes cover", () => {
    expect(coverage(9, 15.5)).toBe(139.5);
    expect(coverage(3, 11.63)).toBe(34.89);
  });
});

describe("quote totals and money", () => {
  it("sums lines and caps the discount at the subtotal", () => {
    expect(quoteTotals([100_00, 250_50], 50_00)).toEqual({ subtotal: 350_50, discount: 50_00, total: 300_50 });
    expect(quoteTotals([100_00], 500_00)).toEqual({ subtotal: 100_00, discount: 100_00, total: 0 });
    expect(quoteTotals([100_00], -5)).toEqual({ subtotal: 100_00, discount: 0, total: 100_00 });
  });

  it("formats rupees the Indian way, with paise only when there are some", () => {
    expect(formatInr(123456_00)).toBe("₹1,23,456");
    expect(formatInr(1245_50)).toBe("₹1,245.50");
    expect(rupeesToPaise(1245.5)).toBe(124550);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });

  it("numbers quotes per shop and keeps them valid for 7 days from sending", () => {
    expect(quoteNumber("KT", 7)).toBe("KT-0007");
    expect(quoteNumber("KT", 12345)).toBe("KT-12345");
    expect(validUntil({ sentAt: "2026-10-24T05:00:00.000Z", createdAt: "2026-10-20T05:00:00.000Z" })).toBe("2026-10-31T05:00:00.000Z");
    expect(validUntil({ sentAt: null, createdAt: "2026-10-20T05:00:00.000Z" })).toBe("2026-10-27T05:00:00.000Z");
  });

  it("formats phones and first names", () => {
    expect(formatPhone("9000000101")).toBe("90000 00101");
    expect(firstName("  Ravi Teja Varma ")).toBe("Ravi");
  });
});

describe("shop time (India)", () => {
  // Saturday 24 Oct 2026, 20:00 UTC is Sunday 25 Oct, 01:30 in India.
  const lateUtc = new Date("2026-10-24T20:00:00Z");

  it("reads the day in India, not UTC", () => {
    expect(shopDay(lateUtc)).toBe("2026-10-25");
    expect(endOfShopToday(lateUtc).toISOString()).toBe("2026-10-25T18:30:00.000Z");
  });

  it("starts the week on Monday and the month on the 1st, at midnight in India", () => {
    // Sunday 25 Oct belongs to the week of Monday 19 Oct.
    expect(startOfShopWeek(lateUtc).toISOString()).toBe("2026-10-18T18:30:00.000Z");
    expect(startOfShopWeek(new Date("2026-10-19T00:00:00Z")).toISOString()).toBe("2026-10-18T18:30:00.000Z");
    expect(startOfShopMonth(lateUtc).toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(addDays("2026-10-24T00:00:00.000Z", 2).toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });
});
