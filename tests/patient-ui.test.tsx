import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BookingForm } from "@/demos/lotus-clinic/BookingForm";
import { Dashboard } from "@/demos/lotus-clinic/Dashboard";
import { consentLine } from "@/demos/lotus-clinic/DashboardParts";
import { PatientVisit } from "@/demos/lotus-clinic/PatientVisit";
import { BOOKING_FLAG_DEFAULTS, type DashboardBooking } from "@/lib/bookings/types";
import type { PublicVisit } from "@/lib/bookings/publicVisit";
import { requestReceivedText } from "@/lib/whatsapp/texts";

const TOKEN = "Xk3v9QmT0bLr2aWc8YpE5nHd";
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useParams: () => ({ token: "Xk3v9QmT0bLr2aWc8YpE5nHd" }),
}));

afterEach(() => vi.restoreAllMocks());

const TODAY = "2026-10-20"; // Tuesday

function make(over: Partial<DashboardBooking>): DashboardBooking {
  return {
    id: crypto.randomUUID(),
    createdAt: "2026-10-19T04:00:00.000Z",
    clinicSlug: "lotus-clinic",
    name: "Priya Sharma",
    phone: "9876543210",
    visitType: "clinic",
    date: TODAY,
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
    ...over,
  };
}
const props = { today: TODAY, live: true, bookHref: "/clinic/website/book", onStatus: () => {}, onLogout: () => {} };

function tomorrowLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("booking success screen", () => {
  it("previews exactly the request-received message the server sends, with no buttons, and the call line", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "3f2a9c1e-0000-4000-8000-000000000000" }), { status: 201 }));
    const { container } = render(<BookingForm initialVisitType="clinic" optIn={null} />);
    const date = tomorrowLocal();
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Priya Sharma" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "98765 43210" } });
    fireEvent.change(screen.getByLabelText("Preferred date"), { target: { value: date } });
    fireEvent.change(screen.getByLabelText("Time of day"), { target: { value: "Evening, 5 pm – 7 pm" } });
    fireEvent.change(screen.getByLabelText("Reason for the visit"), { target: { value: "PCOS" } });
    fireEvent.click(screen.getByRole("button", { name: "Request appointment" }));
    await waitFor(() => expect(screen.getByText("Request received")).toBeTruthy());
    const preview = container.querySelector("[data-request-preview]")!;
    expect(preview.textContent).toContain(requestReceivedText({ date, slot: "Evening, 5 pm – 7 pm" }));
    expect(requestReceivedText({ date, slot: "Evening, 5 pm – 7 pm" })).toMatch(/^We've received your request for \w{3} \d{1,2} \w{3}, Evening, 5 pm – 7 pm\. The clinic will confirm on WhatsApp\.$/);
    expect(container.querySelector("[data-preview-buttons]")).toBeNull();
    expect(screen.queryByText("Change time")).toBeNull();
    expect(screen.getByText("We'll confirm on WhatsApp. If you're not on WhatsApp, the clinic will call you.")).toBeTruthy();
  });
});

describe("dashboard states", () => {
  it("shows Waiting for patient, the No WhatsApp chip with Call and Confirmed by phone, and opted out", () => {
    const onStatus = vi.fn();
    const waiting = make({ name: "Waiting Wani", date: "2026-10-22", awaitingPatient: true, whatsapp: { kind: "visit_moved", status: "read", error: null, at: "2026-10-20T04:10:00.000Z" } });
    const noWa = make({ name: "Call Chandra", date: "2026-10-21", noWhatsApp: true, phone: "9123456789" });
    const stopped = { ...make({ name: "Stopped Sita", date: "2026-10-22", phone: "9234567890" }), optedOut: true };
    render(<Dashboard {...props} bookings={[waiting, noWa, stopped]} needsAction={[noWa]} onStatus={onStatus} />);

    const chip = screen.getByText("No WhatsApp. Call to confirm.");
    expect(chip.className).toContain("bg-lotus-warn-soft");
    const row = chip.closest("li")!;
    expect(within(row).getByRole("link", { name: "Call Call Chandra" }).getAttribute("href")).toBe("tel:+919123456789");
    fireEvent.click(within(row).getByRole("button", { name: "Confirmed by phone Call Chandra" }));
    expect(onStatus).toHaveBeenCalledWith(noWa.id, "confirmed", { byPhone: true });

    fireEvent.click(screen.getByRole("tab", { name: /Upcoming/ }));
    const waitingRow = screen.getByRole("button", { name: "Open Waiting Wani's history" }).closest("li")!;
    expect(within(waitingRow).getByText("Waiting for patient")).toBeTruthy();
    expect(within(waitingRow).getByText(/^WhatsApp visit moved: read/)).toBeTruthy();
    const stoppedRow = screen.getByRole("button", { name: "Open Stopped Sita's history" }).closest("li")!;
    expect(within(stoppedRow).getByText("WhatsApp: opted out")).toBeTruthy();
  });

  it("lists tomorrow's No-WhatsApp visits under Call to remind on Today", () => {
    const noWa = make({ name: "Call Chandra", date: "2026-10-21", noWhatsApp: true, phone: "9123456789" });
    const fine = make({ name: "Fine Fatima", date: "2026-10-21" });
    const later = make({ name: "Later Latha", date: "2026-10-22", noWhatsApp: true });
    render(<Dashboard {...props} bookings={[make({ name: "Today Tara" }), noWa, fine, later]} needsAction={[]} />);
    fireEvent.click(screen.getByRole("tab", { name: /^Today/ }));
    const list = screen.getByRole("region", { name: /Call to remind/ });
    expect(list.textContent).toContain("Call Chandra");
    expect(list.textContent).not.toMatch(/Fine Fatima|Later Latha|Today Tara/);
    expect(within(list).getByRole("link", { name: "Call Call Chandra" }).getAttribute("href")).toBe("tel:+919123456789");
  });

  it("writes the consent line in clinic time", () => {
    expect(consentLine({ consentAt: "2026-11-10T05:12:00.000Z", consentSource: "website" })).toBe("WhatsApp consent: website, 10 Nov 2026, 10:42");
    expect(consentLine({ consentAt: "2026-11-10T05:12:00.000Z", consentSource: "staff" })).toBe("WhatsApp consent: staff, 10 Nov 2026, 10:42");
    expect(consentLine({ consentAt: null, consentSource: null })).toBe("No WhatsApp consent");
  });
});

describe("the patient page", () => {
  const visit: PublicVisit = { date: "2026-10-22", slot: "Morning, 10 am – 1 pm", visitType: "clinic", status: "confirmed", wantsNewTime: false, requestedDate: null, requestedSlot: null, awaitingPatient: false };
  const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it("shows the visit, the address with directions, and the three actions; no name or phone", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(answer({ ok: true, today: TODAY, visit }));
    const { container } = render(<PatientVisit />);
    await screen.findByRole("heading", { name: "Your visit" });
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/bookings/view/${TOKEN}`);
    expect(screen.getByText("Thursday, 22 October")).toBeTruthy();
    expect(screen.getByText("Morning, 10 am – 1 pm")).toBeTruthy();
    expect(screen.getByText("Clinic visit")).toBeTruthy();
    expect(screen.getByText(/Beach Road, Siripuram/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Get directions" }).getAttribute("href")).toContain("maps.google.com");
    for (const name of ["Add to calendar", "Change day or slot", "Cancel visit"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(container.textContent).not.toMatch(/Priya|98765|Pregnancy/);
  });

  it("sends a change request and says so", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(answer({ ok: true, today: TODAY, visit }))
      .mockResolvedValueOnce(answer({ ok: true, visit: { ...visit, wantsNewTime: true, requestedDate: "2026-10-26", requestedSlot: "Evening, 5 pm – 7 pm" } }));
    render(<PatientVisit />);
    fireEvent.click(await screen.findByRole("button", { name: "Change day or slot" }));
    const form = screen.getByRole("form", { name: "Change day or slot" });
    fireEvent.change(within(form).getByLabelText("New day"), { target: { value: "2026-10-26" } });
    fireEvent.change(within(form).getByLabelText("Time of day"), { target: { value: "Evening, 5 pm – 7 pm" } });
    fireEvent.click(within(form).getByRole("button", { name: "Send request" }));
    await screen.findByText("Request sent. The clinic will confirm the new time on WhatsApp.");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ action: "change", date: "2026-10-26", slot: "Evening, 5 pm – 7 pm" });
    expect(screen.getByText("You asked for Monday, 26 October, Evening, 5 pm – 7 pm. The clinic will confirm on WhatsApp.")).toBeTruthy();
  });

  it("cancels only after the confirm step", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(answer({ ok: true, today: TODAY, visit }))
      .mockResolvedValueOnce(answer({ ok: true, visit: { ...visit, status: "cancelled" } }));
    render(<PatientVisit />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel visit" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const group = screen.getByRole("group", { name: "Cancel visit" });
    fireEvent.click(within(group).getByRole("button", { name: "Yes, cancel visit" }));
    await screen.findByText("Your visit is cancelled.");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ action: "cancel" });
    expect(screen.queryByRole("button", { name: "Change day or slot" })).toBeNull();
  });

  it("says the link has expired, with the clinic phone", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(answer({ ok: false, expired: true }, 410));
    render(<PatientVisit />);
    await screen.findByRole("heading", { name: "This link has expired" });
    expect(screen.getByRole("link", { name: "Call +91 73821 30063" }).getAttribute("href")).toBe("tel:+917382130063");
  });

  it("says an unknown link is not valid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(answer({ ok: false }, 404));
    render(<PatientVisit />);
    await screen.findByRole("heading", { name: "This link is not valid" });
  });
});
