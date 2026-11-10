"use client";

import { X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { EASE, useCalmMotion } from "./Motion";

/**
 * A modal for the clinic dashboard: a sheet from the bottom on phones, a centred card from 640px.
 * Escape and the backdrop close it. Focus moves into it on open and back where it was on close.
 */
export function AdminDialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const calm = useCalmMotion();
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          key="backdrop"
          className="fixed inset-0 z-50 flex items-end justify-center bg-lotus-text/40 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-lotus-lift sm:max-w-lg sm:rounded-3xl sm:p-7"
            initial={calm ? { opacity: 0 } : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={calm ? { opacity: 0 } : { y: 16, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight text-lotus-text">
                {title}
              </h2>
              <button type="button" data-close onClick={onClose} aria-label="Close" className="-m-2 rounded-full p-2 text-lotus-muted hover:text-lotus-text">
                <X aria-hidden className="size-5" strokeWidth={2} />
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
