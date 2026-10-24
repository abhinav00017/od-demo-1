"use client";

import { m } from "motion/react";
import { useEffect, useState } from "react";
import { ENQUIRY_TEXT, whatsAppHref } from "./data";

/** The round WhatsApp button. It fades in once the visitor scrolls past the first screen, as on the original site. */
export function WhatsAppFloat() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.95);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <m.a
      href={whatsAppHref(ENQUIRY_TEXT)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp about Sky49 Hyderabad"
      aria-hidden={shown ? undefined : true}
      tabIndex={shown ? undefined : -1}
      initial={false}
      animate={{ opacity: shown ? 1 : 0 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className={`fixed right-4 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-wa-green text-2xl text-white sm:right-8 sm:bottom-8 ${
        shown ? "" : "pointer-events-none"
      }`}
    >
      <span aria-hidden="true">💬</span>
    </m.a>
  );
}
