"use client";

import { useId, useState, type FormEvent } from "react";
import { LEAD_SOURCES, type Lead, type LeadSource } from "@/lib/crm/types";
import { api, ApiError } from "./api";
import { Chips } from "./bits";
import { Dialog } from "./Dialog";
import { go } from "./nav";
import { ui } from "./ui";

const SOURCE_LABEL: Record<LeadSource, string> = { "walk-in": "Walk-in", call: "Call", whatsapp: "WhatsApp", referral: "Referral" };
export const sourceLabel = (s: LeadSource) => SOURCE_LABEL[s];

/** New lead: name, mobile, where they came from, notes. Opens the lead when saved. */
export function NewLeadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} title="New lead" onClose={onClose}>
      {/* Remounts on every open, so the form starts empty. */}
      {open ? <LeadForm onClose={onClose} /> : null}
    </Dialog>
  );
}

function LeadForm({ onClose }: { onClose: () => void }) {
  const id = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<LeadSource>("walk-in");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");
    setExistingId(null);
    try {
      const { lead } = await api<{ lead: Lead }>("/api/crm/leads", { method: "POST", body: { name, phone, source, notes } });
      onClose();
      go({ v: "lead", id: lead.id });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setFormError(err.message);
        if (err.status === 409 && typeof err.body.existingId === "string") setExistingId(err.body.existingId);
      } else setFormError("Could not save the lead. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const err = (field: string) =>
    errors[field] ? (
      <p id={`${id}-${field}-err`} className={ui.error}>
        {errors[field]}
      </p>
    ) : null;
  const invalid = (field: string) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `${id}-${field}-err` } : {});

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={`${id}-name`} className={ui.label}>
        Name
      </label>
      <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={ui.input} {...invalid("name")} />
      {err("name")}

      <label htmlFor={`${id}-phone`} className={`mt-4 ${ui.label}`}>
        Mobile number
      </label>
      <input
        id={`${id}-phone`}
        type="tel"
        inputMode="tel"
        placeholder="98765 43210"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="off"
        className={ui.input}
        {...invalid("phone")}
      />
      {err("phone")}

      <p className={`mt-4 ${ui.label}`}>Came in by</p>
      <div className="mt-2">
        <Chips label="Came in by" value={source} onChange={setSource} options={LEAD_SOURCES.map((s) => ({ value: s, label: SOURCE_LABEL[s] }))} />
      </div>

      <label htmlFor={`${id}-notes`} className={`mt-4 ${ui.label}`}>
        Notes <span className="font-normal text-muted">(optional)</span>
      </label>
      <textarea
        id={`${id}-notes`}
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Rooms, sizes, budget, when they plan to buy"
        className={ui.input}
      />

      {formError && !Object.keys(errors).length ? <p role="alert" className={ui.error}>{formError}</p> : null}
      {existingId ? (
        <p role="alert" className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-crm-warn-soft p-3 text-sm text-ink">
          {formError}
          <button
            type="button"
            className="font-semibold text-crm-accent underline underline-offset-4"
            onClick={() => {
              onClose();
              go({ v: "lead", id: existingId });
            }}
          >
            Open that lead
          </button>
        </p>
      ) : null}

      <div className="mt-6 flex gap-3">
        <button type="submit" disabled={busy} className={`flex-1 ${ui.primary}`}>
          {busy ? "Saving…" : "Save lead"}
        </button>
        <button type="button" onClick={onClose} className={ui.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
