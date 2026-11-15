"use client";

import { MessageCircle, Phone, SendHorizontal, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { readAttribution, safeLocalStorage } from "./attribution";
import { SUCCESS_LINE } from "./BookingForm";
import { clinic, clinicWhatsAppHref } from "./data";
import { useMenuState } from "./MenuState";
import { EASE, SOFT_SPRING, useCalmMotion } from "./Motion";

/**
 * Ogi, the onlydevs chat bot, on the Lotus clinic site. A 56px white circle with Ogi at 40px (never on solid purple,
 * docs/ogi-image-guidelines.html). It sits above the sticky bottom bar on phones and above the two round buttons on
 * desktops, and steps aside while the mobile menu is open. The page only names itself ("lotus-clinic"); the server
 * decides the business, the role and the tools. With no model key the panel shows "Ogi is resting".
 */

type Msg = { from: "visitor" | "ogi"; text: string; confirm?: ConfirmCard; done?: string };
type ConfirmCard = {
  token: string;
  expiresAt: number;
  consentText: string;
  summary: { name: string; phone: string; visitType: string; day: string; slot: string; reason: string };
};
type Status = "idle" | "checking" | "awake" | "resting";

const OGI_SRC = "/brand/ogi-clinic.svg";
const OGI_ALT = "Ogi, the onlydevs bot";
const MAX_CHARS = 800;
/** The server caps a request at 20 messages; send the latest 19 plus the new one. */
const HISTORY = 19;

function OgiFace({ size }: { size: number }) {
  return <Image src={OGI_SRC} alt="" width={size} height={size} unoptimized draggable={false} className="pointer-events-none select-none" />;
}

export function OgiBubble({ page, withBar }: { page: string; withBar: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [greeting, setGreeting] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const { open: menuOpen } = useMenuState();
  const calm = useCalmMotion();
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
    fetch(`/api/ogi/chat?page=${encodeURIComponent(page)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok?: boolean; awake?: boolean; greeting?: string }) => {
        setGreeting(d.greeting ?? "");
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

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim().slice(0, MAX_CHARS);
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
          page,
          messages: next.slice(-HISTORY - 1).map((m) => ({ role: m.from === "visitor" ? "user" : "assistant", content: m.text })),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; reply?: string; confirm?: ConfirmCard; resting?: boolean; error?: string };
      if (data.resting) {
        setStatus("resting");
      } else if (data.ok && data.reply) {
        setMessages((ms) => [...ms, { from: "ogi", text: data.reply!, confirm: data.confirm }]);
      } else {
        setMessages((ms) => [...ms, { from: "ogi", text: data.error ?? `Sorry, something went wrong. Please call or WhatsApp the clinic on ${clinic.phone}.` }]);
      }
    } catch {
      setMessages((ms) => [...ms, { from: "ogi", text: `Sorry, I couldn't reach the clinic. Please call or WhatsApp ${clinic.phone}.` }]);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(index: number, card: ConfirmCard) {
    if (confirming !== null) return;
    setConfirming(index);
    let done: string;
    try {
      const res = await fetch("/api/ogi/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: card.token, ...(readAttribution(safeLocalStorage()) ?? {}) }),
      });
      const data = (await res.json()) as { ok?: boolean; ref?: string; error?: string };
      done = data.ok && data.ref ? `Request sent. Your reference is ${data.ref}. ${SUCCESS_LINE}` : (data.error ?? "That did not go through. Please try the booking page.");
    } catch {
      done = "That did not go through. Please try again, or use the booking page.";
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

  // Phones: above the sticky bar when the page has one. Desktops: above the Book and WhatsApp round buttons.
  const place = withBar
    ? "right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-[10rem]"
    : "right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-6";
  const away = calm ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 };

  return (
    <>
      <AnimatePresence>
        {menuOpen ? null : (
          <m.button
            key="ogi-button"
            ref={buttonRef}
            type="button"
            data-ogi-button=""
            data-motion=""
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={toggle}
            className={`group fixed z-30 flex size-14 items-center justify-center rounded-full bg-white shadow-lotus-lift ring-1 ring-brand-soft ${place}`}
            initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: calm ? 1 : 0.8 }}
            transition={{ opacity: { duration: 0.3, delay: 0.7 }, scale: { ...SOFT_SPRING, stiffness: 260, damping: 20, delay: 0.7 } }}
            whileHover={calm ? undefined : { y: -2, scale: 1.04, transition: { duration: 0.2, ease: EASE } }}
            whileTap={calm ? undefined : { scale: 0.96 }}
          >
            <OgiFace size={40} />
            <span
              aria-hidden
              className="pointer-events-none absolute right-full mr-3 hidden rounded-full bg-lotus-text px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white opacity-0 shadow-lotus transition-[opacity,translate] duration-200 ease-out translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:translate-x-0 lg:block"
            >
              Ask Ogi
            </span>
            <span className="sr-only">Chat with Ogi, the clinic&apos;s assistant</span>
          </m.button>
        )}
      </AnimatePresence>

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
            className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex h-[min(36rem,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-lotus-lift ring-1 ring-lotus-hairline sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[24rem]"
            initial={away}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={away}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <header className="flex items-center gap-3 border-b border-lotus-hairline px-4 py-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                <Image src={OGI_SRC} alt={OGI_ALT} width={36} height={36} unoptimized />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-base font-semibold text-lotus-text">
                  Ogi
                </h2>
                <p className="truncate text-sm text-lotus-muted">{clinic.name} assistant</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="flex size-11 items-center justify-center rounded-full text-lotus-muted transition hover:bg-lotus-wash hover:text-lotus-text"
              >
                <X aria-hidden strokeWidth={1.75} className="size-5" />
                <span className="sr-only">Close chat</span>
              </button>
            </header>

            {status === "resting" ? (
              <Resting />
            ) : (
              <>
                <div ref={listRef} aria-live="polite" aria-busy={busy || status === "checking"} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" data-ogi-log="">
                  {status === "checking" ? <p className="text-sm text-lotus-muted">Waking Ogi…</p> : null}
                  {status === "awake" ? <OgiLine text={greeting} /> : null}
                  {messages.map((msg, i) =>
                    msg.from === "visitor" ? (
                      <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-lotus-accent px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-wrap text-white">
                        <span className="sr-only">You: </span>
                        {msg.text}
                      </p>
                    ) : (
                      <div key={i} className="space-y-2">
                        <OgiLine text={msg.text} />
                        {msg.confirm ? (
                          <Summary card={msg.confirm} done={msg.done} busy={confirming === i} onConfirm={() => void confirm(i, msg.confirm!)} />
                        ) : null}
                      </div>
                    ),
                  )}
                  {busy ? <p className="text-sm text-lotus-muted">Ogi is typing…</p> : null}
                </div>

                <form onSubmit={send} className="border-t border-lotus-hairline px-3 pt-3 pb-2">
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
                      placeholder="Ask about the clinic or a visit"
                      className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border-0 bg-white px-3.5 py-2.5 text-base text-lotus-text ring-1 ring-lotus-field placeholder:text-lotus-muted focus:ring-2 focus:ring-lotus-accent focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={busy || !draft.trim() || status !== "awake"}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lotus-accent text-white transition-colors hover:bg-lotus-accent-hover disabled:opacity-50"
                    >
                      <SendHorizontal aria-hidden strokeWidth={1.75} className="size-5" />
                      <span className="sr-only">Send</span>
                    </button>
                  </div>
                  <p className="mt-2 px-1 text-xs text-lotus-muted">Ogi is an AI helper, not a doctor. In an emergency, call 108.</p>
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
    <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-lotus-wash px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-wrap text-lotus-text">
      <span className="sr-only">Ogi: </span>
      {text}
    </p>
  );
}

function Summary({ card, done, busy, onConfirm }: { card: ConfirmCard; done?: string; busy: boolean; onConfirm: () => void }) {
  const rows: [string, string][] = [
    ["Name", card.summary.name],
    ["Mobile", card.summary.phone],
    ["Visit", card.summary.visitType],
    ["Day", card.summary.day],
    ["Time", card.summary.slot],
    ["Reason", card.summary.reason],
  ];
  return (
    <div data-ogi-summary="" className="rounded-2xl bg-white p-4 ring-1 ring-lotus-hairline">
      <p className="text-sm font-semibold text-lotus-text">Your visit request</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-lotus-muted">{k}</dt>
            <dd className="text-lotus-text tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {done ? (
        <p role="status" className="mt-3 text-sm font-medium text-lotus-accent-hover">
          {done}
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-lotus-accent px-5 py-2.5 font-semibold text-white transition-colors hover:bg-lotus-accent-hover disabled:opacity-60"
          >
            {busy ? "Sending…" : "Confirm"}
          </button>
          <p data-ogi-consent="" className="mt-2 text-center text-xs text-lotus-muted">
            {card.consentText}
          </p>
          <p className="mt-1 text-center text-xs text-lotus-muted">Not right? Tell Ogi what to change.</p>
        </>
      )}
    </div>
  );
}

function Resting() {
  return (
    <div data-ogi-resting="" className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-brand-soft">
        <OgiFace size={56} />
      </span>
      <p className="text-lg font-semibold text-lotus-text">Ogi is resting</p>
      <p className="max-w-xs text-sm text-lotus-muted">Ogi is taking a short break. The clinic team is happy to help on WhatsApp or by phone.</p>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        <a
          href={clinicWhatsAppHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-lotus-accent px-5 py-2.5 font-semibold text-white transition-colors hover:bg-lotus-accent-hover"
        >
          <MessageCircle aria-hidden strokeWidth={1.75} className="size-5" />
          WhatsApp the clinic
        </a>
        <a
          href={`tel:${clinic.phone.replace(/\s/g, "")}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-lotus-text ring-1 ring-lotus-field transition hover:text-lotus-accent hover:ring-lotus-accent"
        >
          <Phone aria-hidden strokeWidth={1.75} className="size-5 text-lotus-accent" />
          Call {clinic.phone}
        </a>
      </div>
    </div>
  );
}
