"use client";

import { useState, type FormEvent } from "react";
import { eoiErrors, eoiMessage, whatsAppHref, type Eoi } from "./data";

const FIELD =
  "w-full rounded-none border bg-white/70 px-4 py-3 text-sm text-sky-charcoal placeholder:text-sky-muted focus:border-sky-gold focus:outline-none";

/**
 * The hero "Request a EOI" form. Checks name and mobile in the browser, then opens WhatsApp with the request
 * to the demo number. Nothing is sent to a server or stored.
 */
export function HeroEoiForm() {
  const [eoi, setEoi] = useState<Eoi>({ name: "", phone: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Eoi, string>>>({});
  const [sentHref, setSentHref] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = eoiErrors(eoi);
    setErrors(found);
    if (Object.keys(found).length) return;
    const href = whatsAppHref(eoiMessage(eoi));
    window.open(href, "_blank", "noopener,noreferrer");
    setSentHref(href);
  };

  if (sentHref) {
    return (
      <div role="status" className="mt-6 space-y-3">
        <p className="text-sm font-semibold text-sky-success">Your EOI is ready on WhatsApp.</p>
        <p className="text-sm text-sky-muted">Send the message and our advisory desk calls you back.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold">
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
    <form className="mt-6 space-y-4" aria-label="Hero mini phone form" onSubmit={onSubmit} noValidate>
      <div>
        <label className="sr-only" htmlFor="hero-eoi-name">
          Name
        </label>
        <input
          id="hero-eoi-name"
          name="name"
          type="text"
          value={eoi.name}
          onChange={(e) => setEoi({ ...eoi, name: e.target.value })}
          required
          placeholder="Enter your name"
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "hero-eoi-name-error" : undefined}
          className={`${FIELD} ${errors.name ? "border-sky-error" : "border-sky-stone/50"}`}
        />
        {errors.name ? (
          <p id="hero-eoi-name-error" className="mt-1.5 text-xs text-sky-error">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label className="sr-only" htmlFor="hero-eoi-phone">
          Phone Number
        </label>
        <input
          id="hero-eoi-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          value={eoi.phone}
          onChange={(e) => setEoi({ ...eoi, phone: e.target.value })}
          required
          placeholder="Enter your phone number"
          autoComplete="tel"
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={errors.phone ? "hero-eoi-phone-error" : undefined}
          className={`${FIELD} ${errors.phone ? "border-sky-error" : "border-sky-stone/50"}`}
        />
        {errors.phone ? (
          <p id="hero-eoi-phone-error" className="mt-1.5 text-xs text-sky-error">
            {errors.phone}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className="inline-flex w-full cursor-pointer items-center justify-center bg-sky-charcoal px-6 py-4 text-sm font-semibold text-white transition hover:bg-sky-gold hover:text-sky-charcoal"
      >
        Register EOI Now
      </button>
    </form>
  );
}
