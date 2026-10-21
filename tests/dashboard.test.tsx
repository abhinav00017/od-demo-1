import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard, whatsappLine } from "@/demos/lotus-clinic/Dashboard";
import { dashboardCounts, endOfWeek, maskPhone } from "@/demos/lotus-clinic/dashboardData";
import type { Booking, DashboardBooking } from "@/lib/bookings/types";

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
  it("groups by day, morning first, with counts in the header", () => {
    render(<Dashboard {...props} bookings={bookings} />);
    const days = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(days).toEqual(["Today2 bookings", "Tomorrow1 booking", "Fri, 23 Oct1 booking", "Tue, 27 Oct1 booking"]);
    const today = screen.getByRole("region", { name: /Today/ });
    const names = within(today).getAllByText(/Meena|Eva/, { selector: "p" }).map((n) => n.textContent);
    expect(names).toEqual(["Morning Meena", "Evening Eva"]);
    expect(within(today).getByText("Online")).toBeTruthy();
    expect(screen.getByText("Today", { selector: "dt" }).nextElementSibling?.textContent).toBe("2");
    expect(screen.getByText("New", { selector: "dt" }).nextElementSibling?.textContent).toBe("3");
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
    render(<Dashboard {...props} bookings={[bookings[1], bookings[2]]} onStatus={onStatus} />);
    expect((screen.getByRole("button", { name: "Confirm Morning Meena" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Tomorrow Tara" }));
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
  });
});
