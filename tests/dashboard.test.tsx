import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard, whatsappLine } from "@/demos/lotus-clinic/Dashboard";
import { dashboardCounts, endOfWeek, maskPhone } from "@/demos/lotus-clinic/dashboardData";
import { BOOKING_FLAG_DEFAULTS, type Booking, type DashboardBooking } from "@/lib/bookings/types";

const TODAY = "2026-10-20"; // Tuesday

function make(over: Partial<Booking>): Booking {
  return {
    id: crypto.randomUUID(),
    createdAt: "2026-10-20T04:00:00.000Z",
    clinicSlug: "lotus-clinic",
    name: "Priya Sharma",
    phone: "9876543210",
    visitType: "clinic",
    date: TODAY,
    slot: "Morning, 10 am – 1 pm",
    reason: "Pregnancy care",
    status: "new",
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

const bookings = [
  make({ name: "Evening Eva", slot: "Evening, 5 pm – 7 pm", visitType: "online", reason: "PCOS" }),
  make({ name: "Morning Meena", status: "confirmed" }),
  make({ name: "Tomorrow Tara", date: "2026-10-21", phone: "9123456789" }),
  make({ name: "Cancelled Chitra", date: "2026-10-23", status: "cancelled" }),
  make({ name: "Next week Nisha", date: "2026-10-27" }),
];

const props = { today: TODAY, live: true, bookHref: "/clinic/website/book", onStatus: () => {}, onLogout: () => {} };

describe("dashboard helpers", () => {
  it("masks phones and counts today, this week and new", () => {
    expect(maskPhone("9876543210")).toBe("98••• ••210");
    expect(endOfWeek(TODAY)).toBe("2026-10-25");
    expect(endOfWeek("2026-10-25")).toBe("2026-10-25");
    expect(dashboardCounts(bookings, TODAY)).toEqual({ today: 2, week: 3, fresh: 3 });
  });
});

describe("Dashboard", () => {
  it("opens on Needs action, and shows today in slot order and the next 7 days grouped by day", () => {
    render(<Dashboard {...props} bookings={bookings} />);
    expect(screen.getByRole("tab", { name: /Needs action/ }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: /^Today/ }));
    const panel = screen.getByRole("tabpanel");
    const names = within(panel).getAllByRole("button", { name: /^Open .*history$/ }).map((n) => n.textContent);
    expect(names).toEqual(["Morning Meena", "Evening Eva"]);
    expect(within(panel).getByText("Online")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Upcoming/ }));
    const days = within(screen.getByRole("tabpanel")).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(days).toEqual(["Tomorrow1 booking", "Fri, 23 Oct1 booking", "Tue, 27 Oct1 booking"]);
    expect(screen.getByText("Today", { selector: "dt" }).nextElementSibling?.textContent).toBe("2");
    expect(screen.getByText("Needs action", { selector: "dt" }).nextElementSibling?.textContent).toBe("3");
    expect(screen.getByText("Visited today", { selector: "dt" }).nextElementSibling?.textContent).toBe("0");
    expect(screen.getByText("Live")).toBeTruthy();
  });

  it("masks the phone until clicked", () => {
    render(<Dashboard {...props} bookings={[bookings[2]]} />);
    const btn = screen.getByRole("button", { name: /Show Tomorrow Tara's full number/ });
    expect(btn.textContent).toBe("91••• ••789");
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: /Hide Tomorrow Tara's number/ }).textContent).toBe("+91 91234 56789");
  });

  it("sends Confirm and Cancel, and disables the current status", () => {
    const onStatus = vi.fn();
    const upcomingConfirmed = make({ name: "Booked Bina", date: "2026-10-22", status: "confirmed" });
    render(<Dashboard {...props} bookings={[bookings[1], bookings[2], upcomingConfirmed]} onStatus={onStatus} />);
    fireEvent.click(screen.getByRole("tab", { name: /Upcoming/ }));
    expect((screen.getByRole("button", { name: "Confirm Booked Bina" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Tomorrow Tara" }));
    fireEvent.click(screen.getByRole("tab", { name: /^Today/ }));
    expect(screen.queryByRole("button", { name: "Confirm Morning Meena" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Morning Meena" }));
    expect(onStatus.mock.calls).toEqual([
      [bookings[2].id, "confirmed"],
      [bookings[1].id, "cancelled"],
    ]);
  });

  it("shows a designed empty state and the memory storage note", () => {
    render(<Dashboard {...props} bookings={[]} storage="memory" />);
    expect(screen.getByRole("heading", { name: "No bookings yet" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open the booking page" }).getAttribute("href")).toBe("/clinic/website/book");
    expect(screen.getByText(/Test storage/)).toBeTruthy();
  });
});

describe("WhatsApp status line", () => {
  it("reads sent, delivered and failed in clinic time", () => {
    // 15:21 UTC is 8:51 pm in India.
    expect(whatsappLine({ kind: "confirmation", status: "sent", error: null, at: "2026-10-20T15:21:00.000Z" })).toBe("WhatsApp: sent 8:51 pm");
    expect(whatsappLine({ kind: "reminder", status: "delivered", error: null, at: "2026-10-20T12:31:00.000Z" })).toBe("WhatsApp reminder: delivered 6:01 pm");
    expect(whatsappLine({ kind: "confirmation", status: "failed", error: "131030: Recipient phone number not in allowed list", at: "2026-10-20T15:21:00.000Z" })).toBe(
      "WhatsApp: failed: 131030: Recipient phone number not in allowed list",
    );
  });

  it("shows on a row only when a message exists", () => {
    const rows: DashboardBooking[] = [
      { ...make({ name: "Sent Sita" }), whatsapp: { kind: "confirmation", status: "sent", error: null, at: "2026-10-20T15:21:00.000Z" } },
      { ...make({ name: "Quiet Qamar" }), whatsapp: null },
    ];
    render(<Dashboard {...props} bookings={rows} />);
    expect(screen.getByText("WhatsApp: sent 8:51 pm")).toBeTruthy();
    expect(screen.getAllByText(/^WhatsApp/)).toHaveLength(1);
    expect(screen.queryByText("via Twilio")).toBeNull();
  });

  it("never names the provider: 'WhatsApp: delivered', no 'via Twilio'", () => {
    const rows: DashboardBooking[] = [
      { ...make({ name: "Twilio Tanvi" }), whatsapp: { kind: "confirmation", status: "delivered", error: null, at: "2026-10-20T15:21:00.000Z", provider: "twilio" } },
      { ...make({ name: "Meta Mira" }), whatsapp: { kind: "reminder", status: "sent", error: null, at: "2026-10-20T15:21:00.000Z", provider: "meta" } },
    ];
    const { container } = render(<Dashboard {...props} bookings={rows} />);
    expect(screen.getByText("WhatsApp: delivered 8:51 pm")).toBeTruthy();
    expect(screen.getByText("WhatsApp reminder: sent 8:51 pm")).toBeTruthy();
    expect(container.textContent).not.toMatch(/Twilio\b(?! Tanvi)|via Meta|\bvia\b/);
  });

  it("says the patient confirmed on WhatsApp, with no provider note", () => {
    const rows: DashboardBooking[] = [
      { ...make({ name: "Tapped Tara", status: "confirmed" }), whatsapp: { kind: "patient_confirmed", status: "delivered", error: null, at: "2026-10-20T15:21:00.000Z", provider: "twilio" } },
    ];
    render(<Dashboard {...props} bookings={rows} />);
    expect(screen.getByText("Patient confirmed on WhatsApp")).toBeTruthy();
    expect(screen.queryByText("via Twilio")).toBeNull();
  });
});

describe("Wants a new time chip", () => {
  it("shows an amber chip only on rows that asked, with Change day or slot and Cancel in Needs action", () => {
    const rows: DashboardBooking[] = [{ ...make({ name: "Moving Maya", status: "confirmed", wantsNewTime: true }) }, { ...make({ name: "Settled Sana" }) }];
    render(<Dashboard {...props} bookings={rows} />);
    const chips = screen.getAllByText("Wants a new time");
    expect(chips).toHaveLength(1);
    expect(chips[0].className).toContain("bg-lotus-warn-soft");
    const row = chips[0].closest("li")!;
    expect(row.textContent).toContain("Moving Maya");
    expect(within(row).getByRole("button", { name: "Change day or slot Moving Maya" })).toBeTruthy();
    expect(within(row).getByRole("button", { name: "Cancel Moving Maya" })).toBeTruthy();
    expect(within(row).queryByRole("button", { name: "Confirm Moving Maya" })).toBeNull();
    const sana = screen.getByRole("button", { name: "Confirm Settled Sana" }).closest("li")!;
    expect(within(sana).getByRole("button", { name: "Cancel Settled Sana" })).toBeTruthy();
  });
});
