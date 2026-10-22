"use client";

import { CalendarCheck, MessageCircle } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useMenuState } from "./MenuState";
import { EASE, PillLink, useCalmMotion } from "./Motion";

/**
 * Phones and tablets only: Book an Appointment and WhatsApp, fixed to the bottom of the screen.
 * The site leaves it out on the book and admin pages, and it steps aside while the menu is open.
 * It slides up on mount and slides down out of the way when the menu opens (fades only, under reduced motion).
 */
export function MobileBar({ bookHref, whatsapp }: { bookHref: string; whatsapp: { href: string; label: string } }) {
  const { open } = useMenuState();
  const calm = useCalmMotion();
  const away = calm ? { opacity: 0 } : { y: "100%" };
  return (
    <AnimatePresence>
      {open ? null : (
        <m.div
          key="bar"
          data-lotus-bar=""
          data-motion=""
          className="fixed inset-x-0 bottom-0 z-30 border-t border-lotus-hairline bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] lg:hidden"
          initial={away}
          animate={{ opacity: 1, y: 0 }}
          exit={away}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <div className="mx-auto flex max-w-xl gap-3">
            <PillLink
              href={bookHref}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-lotus-accent px-4 py-3 text-[15px] font-semibold whitespace-nowrap text-white transition-[color,background-color,box-shadow] hover:bg-lotus-accent-hover sm:px-5 sm:text-base"
            >
              <CalendarCheck aria-hidden strokeWidth={1.75} className="hidden size-5 sm:block" />
              Book an Appointment
            </PillLink>
            <PillLink
              href={whatsapp.href}
              external
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-[15px] font-semibold whitespace-nowrap text-lotus-text sm:px-5 sm:text-base ring-1 ring-lotus-field transition-[color,background-color,box-shadow] hover:text-lotus-accent hover:ring-lotus-accent"
            >
              <MessageCircle aria-hidden strokeWidth={1.75} className="size-5 text-lotus-accent" />
              WhatsApp <span className="sr-only">{whatsapp.label}</span>
            </PillLink>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
