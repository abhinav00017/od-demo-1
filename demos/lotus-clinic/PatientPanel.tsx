"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { SOURCE_LABELS } from "@/lib/bookings/sources";
import type { DashboardBooking, PatientNotes } from "@/lib/bookings/types";
import type { AdminApi } from "./adminApi";
import { initials, longDay, shortDay } from "./dashboardData";
import { BookingFlags, consentLine, Phone, StatusChip, WhatsAppRowLine } from "./DashboardParts";
import { ui } from "./ui";

type Loaded = { visits: DashboardBooking[]; notes: PatientNotes | null };

/**
 * One patient's history, opened from any name. Everyone with the same phone is the same patient.
 * Desktop: a side panel next to the list (sticky under the header). Phones: a full-screen sheet.
 * `version` changes when a booking changes elsewhere, so the panel loads again.
 */
export function PatientPanel({ bookingId, name, api, version, onClose }: { bookingId: string; name: string; api: AdminApi; version: number; onClose: () => void }) {
  const id = useId();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    api.patient(bookingId).then(
      (d) => {
        if (!live) return;
        setData(d);
        setFailed(false);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [api, bookingId, version]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [bookingId, onClose]);

  const visits = data?.visits ?? [];
  const current = visits.find((v) => v.id === bookingId) ?? visits[0];
  const shownName = current?.name ?? name;
  // Source and campaign of the first booking: how the patient first found the clinic.
  const first = [...visits].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const visited = visits.filter((v) => v.status === "visited").map((v) => v.date).sort();

  return (
    <aside
      aria-labelledby={`${id}-name`}
      data-patient-panel=""
      className="fixed inset-0 z-50 overflow-y-auto bg-white p-5 sm:p-7 lg:sticky lg:inset-auto lg:top-24 lg:z-auto lg:max-h-[calc(100dvh-7rem)] lg:rounded-3xl lg:p-6 lg:shadow-lotus lg:ring-1 lg:ring-lotus-hairline"
    >
      <div className="flex items-start gap-4">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-lotus-avatar text-base font-bold text-lotus-accent-hover">
          {initials(shownName)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-name`} className="text-xl font-bold tracking-tight text-lotus-text">
            {shownName}
          </h2>
          {current ? <Phone phone={current.phone} name={shownName} /> : null}
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close patient details" className="-m-1 rounded-full p-2 text-lotus-muted ring-1 ring-lotus-hairline hover:text-lotus-text">
          <X aria-hidden strokeWidth={2} className="size-5" />
        </button>
      </div>

      {failed ? (
        <p role="alert" className="mt-6 text-sm font-semibold text-lotus-error">
          Could not load this patient. Close and try again.
        </p>
      ) : !data ? (
        <p className="mt-6 text-sm">Loading…</p>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-lotus-tint p-3.5">
              <dt>First visit</dt>
              <dd className="mt-0.5 font-semibold text-lotus-text">{visited[0] ? longDay(visited[0]) : "Not yet"}</dd>
            </div>
            <div className="rounded-2xl bg-lotus-tint p-3.5">
              <dt>Visits</dt>
              <dd className="mt-0.5 font-semibold text-lotus-text">
                {visited.length} <span className="font-normal text-lotus-muted">of {visits.length} bookings</span>
              </dd>
            </div>
            <div className="col-span-2 rounded-2xl bg-lotus-tint p-3.5">
              <dt>Source</dt>
              <dd className="mt-0.5 font-semibold text-lotus-text">
                {first ? SOURCE_LABELS[first.source] : "Website"}
                {first?.campaign ? <span className="font-normal text-lotus-muted"> · campaign {first.campaign}</span> : null}
              </dd>
            </div>
          </dl>
          {current ? (
            <p data-consent="" className="mt-3 text-sm text-lotus-muted" title={current.consentText ?? undefined}>
              {consentLine(current)}
            </p>
          ) : null}

          <Notes key={`${bookingId}-${data.notes?.updatedAt ?? ""}`} bookingId={bookingId} api={api} initial={data.notes} />

          <h3 className="mt-6 text-base font-semibold text-lotus-text">Every visit</h3>
          <ol className="mt-3 space-y-2.5">
            {visits.map((v) => (
              <li key={v.id} className="rounded-2xl p-3.5 ring-1 ring-lotus-hairline">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-lotus-text">{shortDay(v.date)}</p>
                  <span className="text-sm">{v.slot.split(",")[0]}</span>
                  <StatusChip status={v.status} />
                  <BookingFlags b={v} />
                </div>
                <p className="mt-1 text-sm">
                  {v.reason}
                  {v.visitType === "online" ? " · Online" : ""}
                </p>
                <WhatsAppRowLine b={v} />
              </li>
            ))}
          </ol>
        </>
      )}
    </aside>
  );
}

/** Front-desk notes. Saved per phone number, shared by every booking of the patient. */
function Notes({ bookingId, api, initial }: { bookingId: string; api: AdminApi; initial: PatientNotes | null }) {
  const id = useId();
  const [text, setText] = useState(initial?.notes ?? "");
  const [saved, setSaved] = useState(initial?.notes ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setState("saving");
    try {
      const notes = await api.saveNotes(bookingId, text);
      setSaved(notes.notes);
      setText(notes.notes);
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-6">
      <label htmlFor={`${id}-notes`} className="block text-base font-semibold text-lotus-text">
        Front-desk notes
      </label>
      <textarea
        id={`${id}-notes`}
        value={text}
        maxLength={2000}
        rows={3}
        onChange={(e) => {
          setText(e.target.value);
          setState("idle");
        }}
        placeholder="Preferences, reports to bring, who to call…"
        className={`${ui.input} min-h-24 resize-y`}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={state === "saving" || text === saved}
          className="inline-flex min-h-10 items-center rounded-full bg-lotus-accent px-4 text-sm font-semibold text-white transition hover:bg-lotus-accent-hover disabled:cursor-not-allowed disabled:bg-lotus-wash disabled:text-lotus-text"
        >
          {state === "saving" ? "Saving…" : "Save notes"}
        </button>
        <p aria-live="polite" className={`text-sm ${state === "error" ? "font-semibold text-lotus-error" : ""}`}>
          {state === "saved" ? "Saved" : state === "error" ? "Could not save. Try again." : ""}
        </p>
      </div>
    </div>
  );
}
