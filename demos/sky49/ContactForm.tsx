"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { INTERESTS, contactErrors, contactMessage, whatsAppHref, type Contact } from "./data";

const EMPTY: Contact = { firstName: "", lastName: "", email: "", phone: "", interest: "", message: "", wantsBrochure: false };

const FIELD =
  "w-full border-b bg-transparent pb-3 text-sky-charcoal placeholder:text-sky-muted/70 focus:border-sky-gold focus:outline-none";
const LABEL = "block text-[10px] font-medium tracking-widest text-sky-muted uppercase";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-sky-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The "Book a site visit" form. Checks the fields in the browser, then opens WhatsApp with the request
 * to the demo number. Nothing is sent to a server or stored.
 */
export function ContactForm() {
  const [form, setForm] = useState<Contact>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Contact, string>>>({});
  const [sentHref, setSentHref] = useState<string | null>(null);

  const set = <K extends keyof Contact>(key: K, value: Contact[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const invalid = (key: keyof Contact) =>
    errors[key] ? { "aria-invalid": true as const, "aria-describedby": `contact-${key}-error` } : {};
  const edge = (key: keyof Contact) => (errors[key] ? "border-sky-error" : "border-sky-stone");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = contactErrors(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    const href = whatsAppHref(contactMessage(form));
    window.open(href, "_blank", "noopener,noreferrer");
    setSentHref(href);
  };

  if (sentHref) {
    return (
      <div role="status" className="relative z-10 flex flex-col items-center justify-center py-16 text-center">
        <div aria-hidden className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sky-success-soft text-sky-success">
          ✓
        </div>
        <h3 className="text-2xl text-sky-charcoal">Thank you</h3>
        <p className="mt-2 text-sky-muted">Your request is typed into WhatsApp. Send it and our advisory desk will contact you shortly.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold tracking-widest uppercase">
          <a href={sentHref} target="_blank" rel="noopener noreferrer" className="text-sky-charcoal underline underline-offset-4">
            Open WhatsApp again
          </a>
          <button type="button" onClick={() => setSentHref(null)} className="cursor-pointer text-sky-charcoal underline underline-offset-4">
            Edit details
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="relative z-10 space-y-8" onSubmit={onSubmit} noValidate aria-label="Book a site visit">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Field id="contact-firstName" label="First name" error={errors.firstName}>
          <input
            id="contact-firstName"
            name="firstName"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            required
            placeholder="First name"
            autoComplete="given-name"
            {...invalid("firstName")}
            className={`${FIELD} ${edge("firstName")}`}
          />
        </Field>
        <Field id="contact-lastName" label="Last name">
          <input
            id="contact-lastName"
            name="lastName"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="Last name"
            autoComplete="family-name"
            className={`${FIELD} border-sky-stone`}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Field id="contact-email" label="Email" error={errors.email}>
          <input
            id="contact-email"
            type="email"
            name="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
            placeholder="you@company.com"
            autoComplete="email"
            {...invalid("email")}
            className={`${FIELD} ${edge("email")}`}
          />
        </Field>
        <Field id="contact-phone" label="Phone" error={errors.phone}>
          <input
            id="contact-phone"
            type="tel"
            inputMode="tel"
            name="phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
            placeholder="+91"
            autoComplete="tel"
            {...invalid("phone")}
            className={`${FIELD} ${edge("phone")}`}
          />
        </Field>
      </div>

      <Field id="contact-interest" label="Interested in" error={errors.interest}>
        <select
          id="contact-interest"
          name="interest"
          value={form.interest}
          onChange={(e) => set("interest", e.target.value)}
          required
          {...invalid("interest")}
          className={`${FIELD} cursor-pointer appearance-none ${edge("interest")}`}
        >
          <option value="" disabled>
            Select residence type
          </option>
          {INTERESTS.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="contact-message" label="Message (optional)">
        <textarea
          id="contact-message"
          name="message"
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          rows={3}
          placeholder="Preferred call time, bank loan needs, etc."
          className={`${FIELD} resize-none border-sky-stone`}
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <input
          type="checkbox"
          id="contact-brochure"
          name="wantsBrochure"
          checked={form.wantsBrochure}
          onChange={(e) => set("wantsBrochure", e.target.checked)}
          className="h-5 w-5 rounded border border-sky-stone accent-sky-gold"
        />
        <label htmlFor="contact-brochure" className="cursor-pointer text-sm text-sky-charcoal">
          Send me the digital brochure
        </label>
      </div>

      <button
        type="submit"
        className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-sky-charcoal px-8 py-4 text-xs font-semibold tracking-widest text-white uppercase transition hover:bg-sky-gold hover:text-sky-charcoal"
      >
        Register EOI Now
      </button>
    </form>
  );
}
