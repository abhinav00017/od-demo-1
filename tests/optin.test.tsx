import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BookingForm } from "@/demos/lotus-clinic/BookingForm";
import { Dashboard, splitHint, whatsappLine, type DeskOptIn } from "@/demos/lotus-clinic/Dashboard";
import type { Booking, DashboardBooking } from "@/lib/bookings/types";
import { qrPath } from "@/lib/qr";
import { displayWhatsAppNumber, whatsappOptIn } from "@/lib/whatsapp/optin";

// Made-up values. The sender and keyword are not secrets, but the SID and token here are fake.
const TWILIO = { TWILIO_ACCOUNT_SID: "AC00000000000000000000000000000000", TWILIO_AUTH_TOKEN: "made-up", TWILIO_WHATSAPP_FROM: "+17372508034" };
const HREF = "https://wa.me/17372508034?text=join%20demo-word";

afterEach(() => vi.restoreAllMocks());

describe("whatsappOptIn", () => {
  it("builds the join link when Twilio is the provider and the keyword is set", () => {
    expect(whatsappOptIn({ ...TWILIO, TWILIO_JOIN_KEYWORD: "demo-word" })).toEqual({ href: HREF, keyword: "demo-word", displayNumber: "+1 737 250 8034" });
    expect(whatsappOptIn({ ...TWILIO, WHATSAPP_PROVIDER: "twilio", TWILIO_JOIN_KEYWORD: " demo-word " })?.href).toBe(HREF);
  });

  it("accepts a whatsapp: prefixed sender and URL-encodes the keyword", () => {
    const o = whatsappOptIn({ ...TWILIO, TWILIO_WHATSAPP_FROM: "whatsapp:+1 737 250 8034", TWILIO_JOIN_KEYWORD: "two words&x" });
    expect(o?.href).toBe("https://wa.me/17372508034?text=join%20two%20words%26x");
    expect(o?.keyword).toBe("two words&x");
  });

  it("is null when there is no join step", () => {
    expect(whatsappOptIn({ ...TWILIO })).toBeNull();
    expect(whatsappOptIn({ ...TWILIO, TWILIO_JOIN_KEYWORD: "   " })).toBeNull();
    expect(whatsappOptIn({ TWILIO_JOIN_KEYWORD: "demo-word" })).toBeNull();
    expect(whatsappOptIn({ ...TWILIO, TWILIO_JOIN_KEYWORD: "demo-word", WHATSAPP_FAKE: "1" })).toBeNull();
    expect(whatsappOptIn({ ...TWILIO, TWILIO_JOIN_KEYWORD: "demo-word", WHATSAPP_PROVIDER: "meta", WHATSAPP_TOKEN: "t" })).toBeNull();
    expect(whatsappOptIn({ ...TWILIO, TWILIO_JOIN_KEYWORD: "demo-word", WHATSAPP_PROVIDER: "fake" })).toBeNull();
    expect(whatsappOptIn({ WHATSAPP_TOKEN: "t", TWILIO_WHATSAPP_FROM: "+17372508034", TWILIO_JOIN_KEYWORD: "demo-word" })).toBeNull();
    expect(whatsappOptIn({})).toBeNull();
  });

  it("formats sender numbers for people", () => {
    expect(displayWhatsAppNumber("17372508034")).toBe("+1 737 250 8034");
    expect(displayWhatsAppNumber("919876543210")).toBe("+91 98765 43210");
    expect(displayWhatsAppNumber("447700900123")).toBe("+447700900123");
  });
});

describe("qrPath", () => {
  it("draws a square code with a quiet zone, the same every time", () => {
    const a = qrPath(HREF);
    expect(a.size).toBeGreaterThanOrEqual(21 + 8);
    expect((a.size - 8 - 17) % 4).toBe(0);
    expect(a.d).toMatch(/^M4 4h7v1h-7z/); // the top-left finder pattern starts with a run of 7
    expect(qrPath(HREF)).toEqual(a);
    expect(qrPath("other").d).not.toBe(a.d);
  });
});

const OPT_IN = { href: HREF, keyword: "demo-word", displayNumber: "+1 737 250 8034" };

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function submitBooking() {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "3f2a9c1e-0000-4000-8000-000000000000" }), { status: 201 }));
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Priya Sharma" } });
  fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "98765 43210" } });
  fireEvent.change(screen.getByLabelText("Preferred date"), { target: { value: tomorrow() } });
  fireEvent.change(screen.getByLabelText("Time of day"), { target: { value: "Morning, 10 am – 1 pm" } });
  fireEvent.change(screen.getByLabelText("Reason for the visit"), { target: { value: "Pregnancy care" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Request appointment" }));
  await waitFor(() => expect(screen.getByText("Request received")).toBeTruthy());
}

describe("booking success screen", () => {
  it("shows the WhatsApp join button when opt-in is configured", async () => {
    render(<BookingForm initialVisitType="online" optIn={OPT_IN} />);
    await submitBooking();
    expect(screen.getByRole("heading", { name: "Get updates on WhatsApp" })).toBeTruthy();
    expect(screen.getByText("Tap once to allow confirmations and reminders on WhatsApp.")).toBeTruthy();
    const button = screen.getByRole("link", { name: "Open WhatsApp" });
    expect(button.getAttribute("href")).toBe(HREF);
    expect(button.getAttribute("target")).toBe("_blank");
    expect(button.getAttribute("rel")).toBe("noopener");
    expect(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "You’ll send a short message to +1 737 250 8034. That’s it.")).toBeTruthy();
    expect(screen.getByText("You’ll get the real message on WhatsApp once the clinic confirms. Tap Open WhatsApp above first.")).toBeTruthy();
    expect(screen.queryByText(/No message was sent/)).toBeNull();
  });

  it("shows no join step when opt-in is not configured", async () => {
    const { container } = render(<BookingForm initialVisitType="online" optIn={null} />);
    await submitBooking();
    expect(screen.queryByRole("link", { name: "Open WhatsApp" })).toBeNull();
    expect(screen.queryByText("Get updates on WhatsApp")).toBeNull();
    expect(container.innerHTML).not.toContain("wa.me");
    expect(screen.getByText("You’ll get the real message on WhatsApp once the clinic confirms.")).toBeTruthy();
    expect(screen.queryByText(/Tap Open WhatsApp/)).toBeNull();
  });
});

const booking: Booking = {
  id: "3f2a9c1e-0000-4000-8000-000000000000",
  createdAt: "2026-10-20T04:00:00.000Z",
  clinicSlug: "lotus-clinic",
  name: "Priya Sharma",
  phone: "9876543210",
  visitType: "clinic",
  date: "2026-10-20",
  slot: "Morning, 10 am – 1 pm",
  reason: "Pregnancy care",
  status: "confirmed",
  notes: null,
};
const props = { today: "2026-10-20", live: true, bookHref: "/clinic/website/book", onStatus: () => {}, onLogout: () => {} };

describe("dashboard opt-in panel", () => {
  const desk: DeskOptIn = { ...OPT_IN, qr: qrPath(HREF) };

  it("shows the QR, the join message and the plain link when configured", () => {
    render(<Dashboard {...props} bookings={[]} optIn={desk} />);
    const panel = screen.getByRole("region", { name: "WhatsApp opt-in" });
    expect(within(panel).getByText("Patients scan this at the desk to get updates on WhatsApp.")).toBeTruthy();
    expect(within(panel).getByText("join demo-word").tagName).toBe("CODE");
    const qr = within(panel).getByRole("img", { name: /QR code/ });
    expect(qr.getAttribute("viewBox")).toBe(`0 0 ${desk.qr.size} ${desk.qr.size}`);
    expect(qr.querySelector("path")?.getAttribute("d")).toBe(desk.qr.d);
    const link = within(panel).getByRole("link", { name: HREF });
    expect(link.getAttribute("href")).toBe(HREF);
  });

  it("is absent when not configured", () => {
    const { container } = render(<Dashboard {...props} bookings={[]} />);
    expect(screen.queryByRole("region", { name: "WhatsApp opt-in" })).toBeNull();
    expect(container.innerHTML).not.toContain("wa.me");
  });
});

describe("no-session hint on the dashboard", () => {
  const error = "63016: Failed to send freeform message because you are outside the allowed window (set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet)";

  it("splits the hint off the reason", () => {
    expect(splitHint(error)).toEqual({
      reason: "63016: Failed to send freeform message because you are outside the allowed window",
      hint: "set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet",
    });
    expect(splitHint("21654: ContentSid Required (set TWILIO_CONTENT_SID_*)").hint).toBe("set TWILIO_CONTENT_SID_*");
    expect(splitHint("20003: Authenticate (other)")).toEqual({ reason: "20003: Authenticate (other)", hint: null });
    expect(splitHint(null)).toEqual({ reason: "", hint: null });
  });

  it("shows the hint on its own line under a failed send", () => {
    const row: DashboardBooking = { ...booking, whatsapp: { kind: "confirmation", status: "failed", error, at: "2026-10-20T15:21:00.000Z", provider: "twilio" } };
    render(<Dashboard {...props} bookings={[row]} />);
    expect(screen.getByText(whatsappLine(row.whatsapp!))).toBeTruthy();
    expect(screen.getByText("Hint: set TWILIO_CONTENT_SID_*, or patient has not joined on WhatsApp yet")).toBeTruthy();
  });
});
