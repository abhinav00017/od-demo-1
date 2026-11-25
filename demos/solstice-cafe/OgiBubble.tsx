"use client";

import { MessageCircle, SendHorizontal, X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cafeAttribution } from "./attribution";
import { WHATSAPP_DISPLAY, cafe, whatsAppHref } from "./data";
import { EASE } from "./Motion";

/**
 * Ogi on the Solstice cafe pages: the same chat API and Confirm flow as the clinic's bubble (demos/lotus-clinic/OgiBubble.tsx),
 * in the cafe's look. Ogi wears the chef hat (public/brand/ogi-cafe.svg) on a white circle with a lavender ring,
 * never on solid purple (docs/ogi-image-guidelines.html). The page only names itself ("solstice-cafe"); the server
 * decides the business, the role and the tools. With no model key the panel shows "Ogi is resting".
 */

type EnquiryCard = {
  kind: "event_enquiry";
  token: string;
  expiresAt: number;
  note: string;
  summary: { venue: string; event: string; day: string; time: string; guests: string; name: string; phone: string; notes: string };
};
type Msg = { from: "visitor" | "ogi"; text: string; confirm?: EnquiryCard; done?: string };
type Status = "idle" | "checking" | "awake" | "resting";

/**
 * Owner mode (25 Nov 2026): on the owner page, `owner` asks for the "solstice-cafe-owner" page. The server answers it
 * only with a valid cafe login cookie; Ogi then reads the cafe's enquiries and orders, and can change nothing.
 */
const VISITOR = { page: "solstice-cafe", src: "/brand/ogi-cafe.svg" } as const;
const OWNER = { page: "solstice-cafe-owner", src: "/brand/ogi-owner.svg" } as const;
const MAX_CHARS = 800;
/** The server caps a request at 20 messages; send the latest 19 plus the new one. */
const HISTORY = 19;

function OgiFace({ size, alt = "", src }: { size: number; alt?: string; src: string }) {
  // The SVG is a little taller than wide. A fixed square box with object-contain keeps its shape, and keeps next/image's
  // "width or height modified" check quiet (the base styles' height: auto would otherwise change only the height).
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      draggable={false}
      style={{ width: size, height: size }}
      className="pointer-events-none object-contain select-none"
    />
  );
}

export function CafeOgiBubble({ owner = false }: { owner?: boolean } = {}) {
  const { page: PAGE, src: OGI_SRC } = owner ? OWNER : VISITOR;
  const [examples, setExamples] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [greeting, setGreeting] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const calm = useReducedMotion() ?? false;
  const titleId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    setOpen((o) => !o);
    // Ask once, on first open, whether Ogi is awake for this page.
    if (status !== "idle") return;
    setStatus("checking");
    fetch(`/api/ogi/chat?page=${PAGE}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok?: boolean; awake?: boolean; greeting?: string; examples?: string[] }) => {
        setGreeting(d.greeting ?? "");
        setExamples(d.examples ?? []);
        setStatus(d.ok && d.awake ? "awake" : "resting");
      })
      .catch(() => setStatus("resting"));
  }

  // Opening moves focus into the panel: the message box when Ogi is awake, else the close button.
  useEffect(() => {
    if (!open) return;
    if (status === "awake") inputRef.current?.focus();
    else closeRef.current?.focus();
  }, [open, status]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, busy]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onPanelKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  }

  async function send(e?: FormEvent, chip?: string) {
    e?.preventDefault();
    const text = (chip ?? draft).trim().slice(0, MAX_CHARS);
    if (!text || busy) return;
    const next: Msg[] = [...messages, { from: "visitor", text }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/ogi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: PAGE,
          messages: next.slice(-HISTORY - 1).map((m) => ({ role: m.from === "visitor" ? "user" : "assistant", content: m.text })),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; reply?: string; confirm?: EnquiryCard; resting?: boolean; error?: string };
      if (data.resting) {
        setStatus("resting");
      } else if (data.ok && data.reply) {
        const card = data.confirm?.kind === "event_enquiry" ? data.confirm : undefined;
        setMessages((ms) => [...ms, { from: "ogi", text: data.reply!, confirm: card }]);
      } else {
        setMessages((ms) => [...ms, { from: "ogi", text: data.error ?? `Sorry, something went wrong. Please WhatsApp the cafe on ${WHATSAPP_DISPLAY}.` }]);
      }
    } catch {
      setMessages((ms) => [...ms, { from: "ogi", text: `Sorry, I couldn't reach the cafe. Please WhatsApp ${WHATSAPP_DISPLAY}.` }]);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(index: number, card: EnquiryCard) {
    if (confirming !== null) return;
    setConfirming(index);
    let done: string;
    try {
      const res = await fetch("/api/ogi/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: card.token, ...(cafeAttribution() ?? {}) }),
      });
      const data = (await res.json()) as { ok?: boolean; ref?: string; error?: string };
      done =
        data.ok && data.ref
          ? `Enquiry sent. Your reference is ${data.ref}. The cafe will call you to confirm the final quote.`
          : (data.error ?? "That did not go through. Please use the form on the venue page.");
    } catch {
      done = "That did not go through. Please try again, or use the form on the venue page.";
    }
    setMessages((ms) => ms.map((msg, i) => (i === index ? { ...msg, done } : msg)));
    setConfirming(null);
  }

  function onInputKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const away = calm ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 };

  return (
    <>
      <m.button
        ref={buttonRef}
        type="button"
        data-ogi-button=""
        data-motion=""
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className="group fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-brand-soft focus-visible:outline-none focus-visible:ring-sol-sage lg:right-6 lg:bottom-6"
        initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.6, ease: EASE }}
        whileHover={calm ? undefined : { y: -2, scale: 1.04 }}
        whileTap={calm ? undefined : { scale: 0.96 }}
      >
        <OgiFace size={40} src={OGI_SRC} />
        <span
          aria-hidden
          className="pointer-events-none absolute right-full mr-3 hidden rounded-full bg-sol-ink px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
        >
          Ask Ogi
        </span>
        <span className="sr-only">{owner ? "Ask Ogi about your enquiries, orders and sales" : "Chat with Ogi, the cafe's assistant"}</span>
      </m.button>

      <AnimatePresence>
        {open ? (
          <m.div
            key="ogi-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            data-ogi-panel=""
            data-motion=""
            onKeyDown={onPanelKey}
            className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex h-[min(36rem,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-sol-stone-200 bg-sol-paper shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[24rem]"
            initial={away}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={away}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <header className="flex items-center gap-3 border-b border-sol-stone-200 bg-white px-4 py-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                <OgiFace size={36} alt="Ogi, the onlydevs bot" src={OGI_SRC} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-base font-semibold text-sol-ink">
                  Ogi
                </h2>
                <p className="truncate text-sm text-sol-stone-600">{owner ? "Your cafe's data" : `${cafe.name} assistant`}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="flex size-11 cursor-pointer items-center justify-center rounded-full text-sol-stone-600 hover:bg-sol-oat hover:text-sol-ink"
              >
                <X aria-hidden strokeWidth={1.75} className="size-5" />
                <span className="sr-only">Close chat</span>
              </button>
            </header>

            {status === "resting" ? (
              <Resting src={OGI_SRC} owner={owner} />
            ) : (
              <>
                <div ref={listRef} aria-live="polite" aria-busy={busy || status === "checking"} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" data-ogi-log="">
                  {status === "checking" ? <p className="text-sm text-sol-stone-600">Waking Ogi…</p> : null}
                  {status === "awake" ? <OgiLine text={greeting} /> : null}
                  {status === "awake" && messages.length === 0 && examples.length ? (
                    <div data-ogi-examples="" className="flex flex-wrap gap-2 pt-1">
                      {examples.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => void send(undefined, q)}
                          className="min-h-9 cursor-pointer rounded-full bg-white px-3 py-1.5 text-left text-sm text-sol-ink ring-1 ring-brand-soft hover:ring-sol-sage"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {messages.map((msg, i) =>
                    msg.from === "visitor" ? (
                      <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-sol-sage px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-wrap text-white">
                        <span className="sr-only">You: </span>
                        {msg.text}
                      </p>
                    ) : (
                      <div key={i} className="space-y-2">
                        <OgiLine text={msg.text} />
                        {msg.confirm ? <Summary card={msg.confirm} done={msg.done} busy={confirming === i} onConfirm={() => void confirm(i, msg.confirm!)} /> : null}
                      </div>
                    ),
                  )}
                  {busy ? <p className="text-sm text-sol-stone-600">Ogi is typing…</p> : null}
                </div>

                <form onSubmit={send} className="border-t border-sol-stone-200 bg-white px-3 pt-3 pb-2">
                  <div className="flex items-end gap-2">
                    <label htmlFor={`${titleId}-input`} className="sr-only">
                      Message Ogi
                    </label>
                    <textarea
                      id={`${titleId}-input`}
                      ref={inputRef}
                      rows={1}
                      value={draft}
                      maxLength={MAX_CHARS}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onInputKey}
                      disabled={status !== "awake"}
                      placeholder={owner ? "Ask about enquiries, orders or sales" : "Ask about the menu or an event"}
                      className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-sol-stone-300 bg-white px-3.5 py-2.5 text-base text-sol-ink placeholder:text-sol-stone-500 focus:border-sol-sage focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={busy || !draft.trim() || status !== "awake"}
                      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-sol-sage text-white hover:bg-sol-sage-deep disabled:opacity-50"
                    >
                      <SendHorizontal aria-hidden strokeWidth={1.75} className="size-5" />
                      <span className="sr-only">Send</span>
                    </button>
                  </div>
                  <p className="mt-2 px-1 text-xs text-sol-stone-500">
                    {owner ? "Ogi reads your enquiries and orders. It cannot change anything." : "Ogi is an AI helper. The cafe confirms every price and booking."}
                  </p>
                </form>
              </>
            )}
          </m.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function OgiLine({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-wrap text-sol-ink ring-1 ring-sol-stone-200">
      <span className="sr-only">Ogi: </span>
      {text}
    </p>
  );
}

function Summary({ card, done, busy, onConfirm }: { card: EnquiryCard; done?: string; busy: boolean; onConfirm: () => void }) {
  const rows: [string, string][] = [
    ["Venue", card.summary.venue],
    ["Event", card.summary.event],
    ["Day", card.summary.day],
    ["Time", card.summary.time],
    ["Guests", card.summary.guests],
    ["Name", card.summary.name],
    ["Mobile", card.summary.phone],
    ...(card.summary.notes ? ([["Notes", card.summary.notes]] as [string, string][]) : []),
  ];
  return (
    <div data-ogi-summary="" className="rounded-xl bg-white p-4 ring-1 ring-sol-stone-200">
      <p className="text-sm font-semibold text-sol-ink">Your event enquiry</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-sol-stone-500">{k}</dt>
            <dd className="text-sol-ink tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {done ? (
        <p role="status" className="mt-3 text-sm font-medium text-sol-sage-deep">
          {done}
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
            className="mt-3 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-sol-sage px-5 py-2.5 text-sm font-medium text-white hover:bg-sol-sage-deep disabled:opacity-60"
          >
            {busy ? "Sending…" : "Confirm"}
          </button>
          <p className="mt-2 text-center text-xs text-sol-stone-500">{card.note}</p>
          <p className="mt-1 text-center text-xs text-sol-stone-500">Not right? Tell Ogi what to change.</p>
        </>
      )}
    </div>
  );
}

function Resting({ src, owner }: { src: string; owner: boolean }) {
  return (
    <div data-ogi-resting="" className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-brand-soft">
        <OgiFace size={56} src={src} />
      </span>
      <p className="text-lg font-semibold text-sol-ink">Ogi is resting</p>
      <p className="max-w-xs text-sm text-sol-stone-600">
        {owner ? "Ogi is taking a short break, or your login has ended. Refresh the page and try again." : "Ogi is taking a short break. The cafe team is happy to help on WhatsApp."}
      </p>
      {owner ? null : <a
        href={whatsAppHref()}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sol-sage px-5 py-2.5 text-sm font-medium text-white hover:bg-sol-sage-deep"
      >
        <MessageCircle aria-hidden strokeWidth={1.75} className="size-5" />
        WhatsApp the cafe
      </a>}
    </div>
  );
}
