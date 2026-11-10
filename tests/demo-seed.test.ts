// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { clinic } from "@/demos/lotus-clinic/data";
import { isDemoPhone } from "@/lib/bookings/demoPhones";
import { addDays, generateDemoData } from "@/lib/bookings/demoSeed";
import { memoryStore, resetMemoryStore } from "@/lib/bookings/memory";
import { BOOKING_FLAG_DEFAULTS, type Booking } from "@/lib/bookings/types";
import { twilioSender } from "@/lib/whatsapp";
import { sendBookingMessage } from "@/lib/whatsapp/notify";

const TODAY = "2026-11-10"; // Tuesday

describe("generateDemoData", () => {
  const data = generateDemoData(TODAY);
  const { bookings } = data;
  const fixed = () => {
    let n = 0;
    return () => `demo-token-${String(n++).padStart(12, "0")}`;
  };

  it("is deterministic apart from the random view tokens: the same today and seed give the same rows, ids included", () => {
    expect(generateDemoData(TODAY, undefined, { token: fixed() })).toEqual(generateDemoData(TODAY, undefined, { token: fixed() }));
    expect(generateDemoData(TODAY, 7, { token: fixed() })).not.toEqual(generateDemoData(TODAY, undefined, { token: fixed() }));
    // Real links are random: nobody can work a demo patient's link out from the seed.
    const tokens = new Set(bookings.map((b) => b.viewToken));
    expect(tokens.size).toBe(bookings.length);
    expect(generateDemoData(TODAY).bookings[0].viewToken).not.toBe(bookings[0].viewToken);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{24}$/);
  });

  it("builds about 45 bookings over the past 60 days, today and the next 7 days", () => {
    expect(bookings).toHaveLength(45);
    expect(bookings.filter((b) => b.date < TODAY)).toHaveLength(32);
    expect(bookings.filter((b) => b.date === TODAY)).toHaveLength(5);
    expect(bookings.filter((b) => b.date > TODAY)).toHaveLength(8);
    for (const b of bookings) {
      expect(b.date >= addDays(TODAY, -61)).toBe(true);
      expect(b.date <= addDays(TODAY, 7)).toBe(true);
    }
  });

  it("moves with today: every date shifts with it", () => {
    const later = generateDemoData(addDays(TODAY, 3));
    expect(later.bookings.filter((b) => b.date === addDays(TODAY, 3))).toHaveLength(5);
    expect(later.bookings.every((b) => b.date <= addDays(TODAY, 10))).toBe(true);
  });

  it("keeps statuses consistent with dates, and fills every tab", () => {
    const past = bookings.filter((b) => b.date < TODAY);
    expect(new Set(past.map((b) => b.status))).toEqual(new Set(["visited", "no_show", "cancelled"]));
    expect(past.filter((b) => b.status === "visited").length).toBeGreaterThan(past.length / 2);
    const today = bookings.filter((b) => b.date === TODAY);
    expect(new Set(today.map((b) => b.status))).toEqual(new Set(["new", "confirmed", "visited"]));
    const future = bookings.filter((b) => b.date > TODAY);
    expect(future.every((b) => b.status === "new" || b.status === "confirmed")).toBe(true);
    // Visited and no-show never on a future day.
    expect(bookings.filter((b) => (b.status === "visited" || b.status === "no_show") && b.date > TODAY)).toEqual([]);
    const waiting = bookings.filter((b) => b.status === "new" || b.wantsNewTime || b.noWhatsApp);
    expect(waiting).toHaveLength(4);
    expect(waiting.filter((b) => b.wantsNewTime)).toHaveLength(1);
  });

  it("has 14 made-up patients, several repeat patients, and phones only in the fake 90000 2xxxx block", () => {
    const byPhone = new Map<string, Booking["name"][]>();
    for (const b of bookings) byPhone.set(b.phone, [...(byPhone.get(b.phone) ?? []), b.name]);
    expect(byPhone.size).toBe(14);
    expect([...byPhone.values()].filter((names) => names.length >= 3).length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...[...byPhone.values()].map((n) => n.length))).toBeLessThanOrEqual(5);
    for (const [phone, names] of byPhone) {
      expect(isDemoPhone(phone)).toBe(true);
      expect(phone).toMatch(/^900002\d{4}$/);
      expect(new Set(names).size).toBe(1);
    }
    expect(bookings.map((b) => b.name).join(" ")).not.toMatch(/Gowthami/i);
  });

  it("no patient has two bookings on the same day", () => {
    const seen = new Set<string>();
    for (const b of bookings) {
      expect(seen.has(`${b.phone}${b.date}`)).toBe(false);
      seen.add(`${b.phone}${b.date}`);
    }
  });

  it("uses the clinic's reasons and slots, and created times before the visit", () => {
    for (const b of bookings) {
      expect(clinic.booking.reasons).toContain(b.reason);
      expect(clinic.booking.slots).toContain(b.slot);
      expect(b.createdAt.slice(0, 10) <= b.date).toBe(true);
      if (b.date >= TODAY) expect(b.createdAt < `${TODAY}T00:00:00`).toBe(true);
    }
  });

  it("weights sources like the brief, with campaigns on ad bookings and walk-ins only in the past", () => {
    const count = (s: string) => bookings.filter((b) => b.source === s).length;
    expect({ website: count("website"), google_ads: count("google_ads"), meta_ads: count("meta_ads"), google_maps: count("google_maps"), walk_in: count("walk_in"), phone: count("phone"), referral: count("referral") }).toEqual({
      website: 18,
      google_ads: 9,
      meta_ads: 5,
      google_maps: 4,
      walk_in: 4,
      phone: 3,
      referral: 2,
    });
    for (const b of bookings) {
      if (b.source === "google_ads" || b.source === "meta_ads") expect(["pregnancy-care-vizag", "pcos-awareness", "fertility-consult"]).toContain(b.campaign);
      else expect(b.campaign).toBeNull();
      if (b.source === "google_ads") expect(b.utm).toMatchObject({ utm_source: "google", utm_medium: "cpc" });
      if (b.source === "walk_in") expect(b.date < TODAY).toBe(true);
    }
  });

  it("shows each new state at least once: waiting for patient, No WhatsApp tomorrow, opted out, requested time, consent", () => {
    const awaiting = bookings.filter((b) => b.awaitingPatient);
    expect(awaiting).toHaveLength(1);
    expect(awaiting[0]).toMatchObject({ status: "confirmed" });
    expect(data.messages.filter((m) => m.bookingId === awaiting[0].id).map((m) => m.kind)).toContain("visit_moved");
    const noWa = bookings.filter((b) => b.noWhatsApp);
    expect(noWa).toHaveLength(1);
    expect(noWa[0]).toMatchObject({ status: "confirmed", date: addDays(TODAY, 1), phoneConfirmedAt: null });
    expect(data.messages.find((m) => m.bookingId === noWa[0].id)).toMatchObject({ status: "failed", error: "63024: Invalid message recipient" });
    expect(data.optOuts).toHaveLength(1);
    const stopper = data.optOuts![0].phone;
    expect(isDemoPhone(stopper)).toBe(true);
    expect(bookings.some((b) => b.phone === stopper && b.date > TODAY)).toBe(true);
    expect([awaiting[0].phone, noWa[0].phone]).not.toContain(stopper);
    const asked = bookings.find((b) => b.wantsNewTime)!;
    expect(asked.requestedDate! > asked.date).toBe(true);
    expect(clinic.booking.slots).toContain(asked.requestedSlot);
    for (const b of bookings.filter((x) => ["website", "google_ads", "meta_ads", "google_maps"].includes(x.source))) {
      expect(b).toMatchObject({ consentSource: "website", consentAt: b.createdAt });
      expect(b.consentText).toContain("may message you on WhatsApp");
    }
    expect(bookings.some((b) => b.consentSource === null)).toBe(true);
  });

  it("adds a few WhatsApp confirmations (delivered or read) on confirmed and visited bookings, and a few notes", () => {
    expect(data.messages.length).toBeGreaterThanOrEqual(5);
    const ids = new Map(bookings.map((b) => [b.id, b]));
    for (const m of data.messages) {
      const b = ids.get(m.bookingId)!;
      expect(["confirmed", "visited"]).toContain(b.status);
      if (b.noWhatsApp) continue;
      expect(["delivered", "read"]).toContain(m.status);
      expect(m.kind).toBe(b.awaitingPatient && m.kind !== "confirmation" ? "visit_moved" : "confirmation");
      expect(m.toMasked).toBe(`••••${b.phone.slice(-4)}`);
    }
    expect(data.notes.length).toBeGreaterThanOrEqual(3);
    for (const n of data.notes) expect(isDemoPhone(n.phone)).toBe(true);
  });

  it("lands as is_demo rows in the store", async () => {
    resetMemoryStore();
    await memoryStore.replaceDemoData("lotus-clinic", data);
    const rows = await memoryStore.list({});
    expect(rows).toHaveLength(45);
    expect(rows.every((b) => b.isDemo)).toBe(true);
    resetMemoryStore();
  });
});

describe("demo guard: no provider call for demo bookings", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetMemoryStore();
  });

  const real: Booking = {
    id: "3f2a9c1e-0000-4000-8000-000000000000",
    createdAt: "2026-11-09T04:30:00.000Z",
    clinicSlug: "lotus-clinic",
    name: "Priya Sharma",
    phone: "9876543210",
    visitType: "clinic",
    date: "2026-11-12",
    slot: "Morning, 10 am – 1 pm",
    reason: "Pregnancy care",
    status: "confirmed",
    notes: null,
    wantsNewTime: false,
    source: "website",
    campaign: null,
    utm: null,
    isDemo: false,
    ...BOOKING_FLAG_DEFAULTS,
    consentAt: "2026-11-09T04:30:00.000Z",
    consentText: "By booking, you agree that Lotus Women's Clinic may message you on WhatsApp about this visit.",
    consentSource: "website",
  };

  it("isDemoPhone matches only 90000 2xxxx, with or without +91", () => {
    expect(isDemoPhone("9000020101")).toBe(true);
    expect(isDemoPhone("+91 90000 20101")).toBe(true);
    expect(isDemoPhone("919000029999")).toBe(true);
    expect(isDemoPhone("9000000101")).toBe(false);
    expect(isDemoPhone("9876543210")).toBe(false);
    expect(isDemoPhone("90000201")).toBe(false);
  });

  it("an is_demo booking or a demo phone never reaches Twilio, logs one line and records skipped (demo)", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ sid: "SM1", status: "queued" }), { status: 201 }));
    const sender = twilioSender({ accountSid: "AC00000000000000000000000000000000", authToken: "made-up", from: "+14155238886", fetchImpl });
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void logs.push(a.map(String).join(" ")));
    for (const kind of ["confirmation", "reminder", "clinic_alert"] as const) {
      const flagged = await sendBookingMessage({ ...real, isDemo: true }, kind, { store: memoryStore, sender, env: { CLINIC_WHATSAPP: "919999999999" } });
      expect(flagged).toMatchObject({ template: "skipped (demo)", provider: "fake", status: "sent", toMasked: "••••3210" });
    }
    const byPhone = await sendBookingMessage({ ...real, phone: "9000020105" }, "confirmation", { store: memoryStore, sender });
    expect(byPhone?.template).toBe("skipped (demo)");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logs.filter((l) => l.includes("skipped (demo)"))).toHaveLength(4);
    expect(logs.join("\n")).not.toMatch(/9876543210|9000020105/);
    // A real booking still goes out.
    await sendBookingMessage(real, "confirmation", { store: memoryStore, sender });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
