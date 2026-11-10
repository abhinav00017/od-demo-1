import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AdminApi } from "@/demos/lotus-clinic/adminApi";
import { Dashboard, actionsFor } from "@/demos/lotus-clinic/Dashboard";
import { adminCounts, initials, matchesQuery, upcomingWeek } from "@/demos/lotus-clinic/dashboardData";
import type { Booking, DashboardBooking, PatientSummary } from "@/lib/bookings/types";

const TODAY = "2026-10-20"; // Tuesday

function make(over: Partial<Booking>): DashboardBooking {
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
    ...over,
  };
}

const seen = make({ name: "Visited Vani", status: "visited", phone: "9000020101" });
const later = make({ name: "Later Lakshmi", slot: "Evening, 5 pm – 7 pm", source: "google_ads", campaign: "pcos-awareness", phone: "9000020102" });
const fresh = make({ name: "New Nandini", date: "2026-10-22", status: "new", source: "meta_ads", phone: "9000020103" });
const moving = make({ name: "Moving Mounika", date: "2026-10-23", wantsNewTime: true, phone: "9000020104" });
const bookings = [seen, later, fresh, moving];
const waiting = [fresh, moving];

function fakeApi(over: Partial<AdminApi> = {}): AdminApi {
  return {
    past: vi.fn(async () => [make({ name: "Past Padma", date: "2026-10-12", status: "visited" })]),
    search: vi.fn(async () => [make({ name: "Found Farheen", date: "2026-09-02", status: "no_show", phone: "9123456789" })]),
    patients: vi.fn(async (): Promise<PatientSummary[]> => [
      { phone: "9000020101", name: "Visited Vani", latestBookingId: seen.id, bookings: 4, visits: 3, firstVisit: "2026-08-25", lastDate: TODAY, source: "google_maps", campaign: null, isDemo: true },
      { phone: "9000020103", name: "New Nandini", latestBookingId: fresh.id, bookings: 1, visits: 0, firstVisit: null, lastDate: "2026-10-22", source: "meta_ads", campaign: "fertility-consult", isDemo: true },
    ]),
    patient: vi.fn(async () => ({
      visits: [
        { ...seen, whatsapp: { kind: "confirmation" as const, status: "read" as const, error: null, at: "2026-10-19T05:00:00.000Z" } },
        make({ name: "Visited Vani", date: "2026-09-10", status: "no_show", phone: "9000020101", source: "google_maps" }),
        make({ name: "Visited Vani", date: "2026-08-25", status: "visited", phone: "9000020101", source: "google_maps", createdAt: "2026-08-20T04:00:00.000Z", campaign: null }),
      ],
      notes: { notes: "Prefers evenings.", updatedAt: "2026-10-18T10:00:00.000Z" },
    })),
    saveNotes: vi.fn(async (_id: string, notes: string) => ({ notes, updatedAt: "2026-10-20T05:00:00.000Z" })),
    createBooking: vi.fn(async (input) => ({ ok: true as const, booking: make({ name: input.name, date: input.date, source: input.source }) })),
    resetDemo: vi.fn(async () => ({ deleted: 45, inserted: 45 })),
    ...over,
  };
}

const props = { today: TODAY, live: true, bookHref: "/clinic/website/book", onStatus: () => {}, onLogout: () => {} };

function renderDash(extra: Partial<Parameters<typeof Dashboard>[0]> = {}) {
  const api = extra.api ?? fakeApi();
  const utils = render(<Dashboard {...props} bookings={bookings} needsAction={waiting} sources={{ website: 5, google_ads: 3, walk_in: 1 }} api={api} {...extra} />);
  return { ...utils, api };
}

const panel = () => screen.getByRole("tabpanel");
const rowNames = () => within(panel()).queryAllByRole("button", { name: /^Open .*history$/ }).map((b) => b.textContent);

describe("admin helpers", () => {
  it("counts needs action, today, visited today and this week", () => {
    expect(adminCounts(bookings, waiting, TODAY)).toEqual({ needsAction: 2, today: 2, visitedToday: 1, week: 4 });
    expect(upcomingWeek(bookings, TODAY).map((b) => b.name)).toEqual(["New Nandini", "Moving Mounika"]);
    expect(initials("Lakshmi Prasanna Varma")).toBe("LV");
    expect(initials("Farheen")).toBe("F");
  });

  it("search matches a name in any case, or the phone's digits (last digits too)", () => {
    expect(matchesQuery(seen, "vani")).toBe(true);
    expect(matchesQuery(seen, "0101")).toBe(true);
    expect(matchesQuery(seen, "90000 20101")).toBe(true);
    expect(matchesQuery(seen, "+91 90000 20101")).toBe(true);
    expect(matchesQuery(seen, "4444")).toBe(false);
    expect(matchesQuery(seen, "")).toBe(true);
  });

  it("row actions by tab", () => {
    const labels = (b: DashboardBooking, c: Parameters<typeof actionsFor>[1]) => actionsFor(b, c).map((a) => a.label);
    expect(labels(fresh, "needs")).toEqual(["Confirm", "Cancel"]);
    expect(labels(moving, "needs")).toEqual(["Reschedule", "Cancel"]);
    expect(labels(make({ status: "new" }), "today")).toEqual(["Confirm", "Visited", "No-show", "Cancel"]);
    expect(labels(later, "today")).toEqual(["Visited", "No-show", "Cancel"]);
    expect(labels(fresh, "upcoming")).toEqual(["Confirm", "Cancel"]);
    expect(labels(later, "past")).toEqual(["Visited", "No-show"]);
    expect(labels(seen, "past")).toEqual([]);
  });
});

describe("tabs", () => {
  it("opens on Needs action when something waits, else Today", () => {
    renderDash();
    expect(screen.getByRole("tab", { name: /Needs action/ }).getAttribute("aria-selected")).toBe("true");
    expect(rowNames()).toEqual(["New Nandini", "Moving Mounika"]);
  });

  it("opens on Today when nothing waits", () => {
    render(<Dashboard {...props} bookings={[seen, later]} needsAction={[]} api={fakeApi()} />);
    expect(screen.getByRole("tab", { name: /^Today/ }).getAttribute("aria-selected")).toBe("true");
    expect(rowNames()).toEqual(["Visited Vani", "Later Lakshmi"]);
  });

  it("shows four count cards, tab counts, source and status chips", () => {
    renderDash();
    const value = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;
    expect([value("Needs action"), value("Today"), value("Visited today"), value("This week")]).toEqual(["2", "2", "1", "4"]);
    expect(screen.getByRole("tab", { name: /Upcoming/ }).textContent).toBe("Upcoming2");
    fireEvent.click(screen.getByRole("tab", { name: /^Today/ }));
    const row = screen.getByRole("button", { name: "Open Later Lakshmi's history" }).closest("li")!;
    expect(within(row).getByText("Google Ads").getAttribute("title")).toBe("Campaign: pcos-awareness");
    expect(within(row).getByText("Confirmed")).toBeTruthy();
    expect(within(screen.getByRole("button", { name: "Open Visited Vani's history" }).closest("li")!).getByText("Visited", { selector: "[data-status]" })).toBeTruthy();
  });

  it("Today rows send Visited and No-show; Past loads the last 30 days and filters by status", async () => {
    const onStatus = vi.fn(async (id: string, status: Booking["status"]) => ({ ...later, id, status }));
    const { api } = renderDash({ onStatus });
    fireEvent.click(screen.getByRole("tab", { name: /^Today/ }));
    fireEvent.click(screen.getByRole("button", { name: "Visited Later Lakshmi" }));
    expect(onStatus).toHaveBeenCalledWith(later.id, "visited");
    expect((screen.getByRole("button", { name: "Visited Visited Vani" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));
    await waitFor(() => expect(rowNames()).toEqual(["Past Padma"]));
    expect(api.past).toHaveBeenLastCalledWith({ from: "2026-09-20", to: "2026-10-19", status: undefined });
    expect(screen.getByRole("button", { name: "Last 30 days" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(screen.getByRole("group", { name: "Status" })).getByRole("button", { name: "No-show" }));
    await waitFor(() => expect(api.past).toHaveBeenLastCalledWith({ from: "2026-09-20", to: "2026-10-19", status: "no_show" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    await waitFor(() => expect(api.past).toHaveBeenLastCalledWith({ from: "2026-10-19", to: "2026-10-19", status: "no_show" }));
    expect((screen.getByRole("button", { name: "Next day" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    await waitFor(() => expect(api.past).toHaveBeenLastCalledWith({ from: "2026-10-18", to: "2026-10-18", status: "no_show" }));
    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "2026-10-01" } });
    await waitFor(() => expect(api.past).toHaveBeenLastCalledWith({ from: "2026-10-01", to: "2026-10-01", status: "no_show" }));
  });

  it("Patients lists everyone with visits, first visit and source", async () => {
    renderDash();
    fireEvent.click(screen.getByRole("tab", { name: "Patients" }));
    const list = await screen.findByRole("list", { name: "Patients" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("3 visits · first Tue, 25 Aug");
    expect(within(items[0]).getByText("Google Maps")).toBeTruthy();
    expect(items[1].textContent).toContain("0 visits · not visited yet");
  });
});

describe("search", () => {
  it("filters every live tab by name or last digits", () => {
    renderDash();
    const box = screen.getByRole("searchbox", { name: "Search name or phone" });
    fireEvent.change(box, { target: { value: "0104" } });
    expect(rowNames()).toEqual(["Moving Mounika"]);
    fireEvent.click(screen.getByRole("tab", { name: /^Today/ }));
    expect(screen.getByText("No matches for “0104”.")).toBeTruthy();
    fireEvent.change(box, { target: { value: "lak" } });
    expect(rowNames()).toEqual(["Later Lakshmi"]);
  });

  it("Past searches every past day on the server, and Patients filters the list", async () => {
    const { api } = renderDash();
    fireEvent.click(screen.getByRole("tab", { name: "Past" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "farh" } });
    await waitFor(() => expect(api.search).toHaveBeenCalledWith("farh"));
    await waitFor(() => expect(rowNames()).toEqual(["Found Farheen"]));
    expect(screen.getByText(/Matches for “farh” on any past day/)).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nandini" } });
    fireEvent.click(screen.getByRole("tab", { name: "Patients" }));
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Patients" })).getAllByRole("listitem")).toHaveLength(1));
  });
});

describe("patient panel", () => {
  it("opens from a name with avatar, masked phone, first visit, visit count, source, every visit and notes that save", async () => {
    const { api } = renderDash();
    fireEvent.click(screen.getByRole("tab", { name: /^Today/ }));
    fireEvent.click(screen.getByRole("button", { name: "Open Visited Vani's history" }));
    const aside = await screen.findByRole("complementary", { name: "Visited Vani" });
    expect(api.patient).toHaveBeenCalledWith(seen.id);
    await within(aside).findByText("Every visit");
    expect(within(aside).getByText("VV")).toBeTruthy();
    expect(within(aside).getByRole("button", { name: "Show Visited Vani's full number" }).textContent).toBe("90••• ••101");
    expect(within(aside).getByText("First visit").nextElementSibling?.textContent).toBe("25 Aug 2026");
    expect(within(aside).getByText("Visits").nextElementSibling?.textContent).toBe("2 of 3 bookings");
    expect(within(aside).getByText("Source").nextElementSibling?.textContent).toBe("Google Maps");
    const visits = within(aside).getAllByRole("listitem");
    expect(visits.map((v) => v.querySelector("p")?.textContent)).toEqual(["Tue, 20 Oct", "Thu, 10 Sept", "Tue, 25 Aug"]);
    expect(within(visits[0]).getByText(/^WhatsApp: read/)).toBeTruthy();
    expect(within(visits[1]).getByText("No-show")).toBeTruthy();

    const notes = within(aside).getByLabelText("Front-desk notes") as HTMLTextAreaElement;
    expect(notes.value).toBe("Prefers evenings.");
    const save = within(aside).getByRole("button", { name: "Save notes" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(notes, { target: { value: "Prefers evenings. Bring scan." } });
    fireEvent.click(save);
    await within(aside).findByText("Saved");
    expect(api.saveNotes).toHaveBeenCalledWith(seen.id, "Prefers evenings. Bring scan.");

    fireEvent.click(within(aside).getByRole("button", { name: "Close patient details" }));
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("opens from the Patients tab by the latest booking id, and closes on Escape", async () => {
    const { api } = renderDash();
    fireEvent.click(screen.getByRole("tab", { name: "Patients" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open New Nandini's history" }));
    expect(api.patient).toHaveBeenCalledWith(fresh.id);
    await screen.findByRole("complementary");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("complementary")).toBeNull();
  });
});

describe("new booking dialog", () => {
  it("has every field, WhatsApp off by default, and saves through the API", async () => {
    const onRefresh = vi.fn();
    const { api } = renderDash({ onRefresh });
    fireEvent.click(screen.getByRole("button", { name: "New booking" }));
    const dialog = screen.getByRole("dialog", { name: "New booking" });
    for (const label of ["Name", "Mobile number", "Date", "Time", "Visit type", "Reason", "Source"]) expect(within(dialog).getByLabelText(label)).toBeTruthy();
    const source = within(dialog).getByLabelText("Source") as HTMLSelectElement;
    expect([...source.options].map((o) => o.textContent)).toEqual(["Walk-in", "Phone", "Referral", "Website", "Google Ads", "Meta Ads", "Google Maps", "Other"]);
    const whatsapp = within(dialog).getByRole("checkbox", { name: /Send confirmation on WhatsApp/ }) as HTMLInputElement;
    expect(whatsapp.checked).toBe(false);
    expect((within(dialog).getByLabelText("Date") as HTMLInputElement).value).toBe(TODAY);

    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Walk In Wanda" } });
    fireEvent.change(within(dialog).getByLabelText("Mobile number"), { target: { value: "98765 11111" } });
    fireEvent.change(source, { target: { value: "phone" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save booking" }));
    // The dialog fades out; in jsdom its exit never runs, so the notice is the sign it closed.
    await waitFor(() => expect(screen.getAllByText(/Booking saved for Walk In Wanda/).length).toBeGreaterThan(0));
    expect(api.createBooking).toHaveBeenCalledWith(expect.objectContaining({ name: "Walk In Wanda", phone: "98765 11111", source: "phone", sendWhatsApp: false }));
    expect(onRefresh).toHaveBeenCalled();
    expect(screen.getAllByText(/Booking saved for Walk In Wanda/).length).toBeGreaterThan(0);
  });

  it("shows the server's field errors and keeps the dialog open", async () => {
    const api = fakeApi({ createBooking: vi.fn(async () => ({ ok: false as const, error: "Please check the highlighted fields.", fieldErrors: { phone: "Enter a 10-digit mobile number, like 98765 43210." } })) });
    renderDash({ api });
    fireEvent.click(screen.getByRole("button", { name: "New booking" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Asha" } });
    fireEvent.change(within(dialog).getByLabelText("Mobile number"), { target: { value: "123" } });
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save booking" }));
    await within(dialog).findByText("Enter a 10-digit mobile number, like 98765 43210.");
    expect(within(dialog).getByLabelText("Mobile number").getAttribute("aria-invalid")).toBe("true");
    expect(api.createBooking).toHaveBeenCalledWith(expect.objectContaining({ sendWhatsApp: true }));
  });
});

describe("reschedule", () => {
  it("opens a dialog for a patient who wants a new time and sends the new day and slot", async () => {
    const onReschedule = vi.fn(async () => null);
    renderDash({ onReschedule });
    fireEvent.click(screen.getByRole("button", { name: "Reschedule Moving Mounika" }));
    const dialog = screen.getByRole("dialog", { name: "Reschedule Moving Mounika" });
    fireEvent.change(within(dialog).getByLabelText("New date"), { target: { value: "2026-10-24" } });
    fireEvent.change(within(dialog).getByLabelText("New time"), { target: { value: "Afternoon, 2 pm – 5 pm" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reschedule and confirm" }));
    await waitFor(() => expect(screen.getAllByText(/Moving Mounika moved to Sat, 24 Oct, afternoon, and confirmed/).length).toBeGreaterThan(0));
    expect(onReschedule).toHaveBeenCalledWith(moving.id, "2026-10-24", "Afternoon, 2 pm – 5 pm");
  });
});

describe("source strip and demo reset", () => {
  it("shows bookings by source for the last 30 days, biggest first", () => {
    renderDash();
    const strip = screen.getByRole("region", { name: /Bookings by source, last 30 days/ });
    expect(within(strip).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Website5", "Google Ads3", "Walk-in1"]);
    expect(strip.textContent).toContain("9 in all");
  });

  it("says so when there are none", () => {
    renderDash({ sources: {} });
    expect(screen.getByText("No bookings in the last 30 days.")).toBeTruthy();
  });

  it("Reset demo data asks first, then resets and refreshes", async () => {
    const onRefresh = vi.fn();
    const { api } = renderDash({ onRefresh });
    fireEvent.click(screen.getByRole("button", { name: "Reset demo data" }));
    expect(screen.getByText(/Real bookings stay as they are/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(api.resetDemo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reset demo data" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Reset now" })));
    expect(api.resetDemo).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalled();
    expect(screen.getAllByText(/Demo data reset: 45 sample bookings/).length).toBeGreaterThan(0);
  });

  it("is disabled when the server turns it off", () => {
    renderDash({ demoReset: false });
    expect((screen.getByRole("button", { name: "Reset demo data" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
