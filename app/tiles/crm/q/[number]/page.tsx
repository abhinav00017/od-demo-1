import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicQuote } from "@/demos/tiles-crm/PublicQuote";
import { KALYANI } from "@/lib/crm/shop";

/**
 * The customer's printable quote, linked from the WhatsApp message. No login: the API checks the link's key.
 * The page is one static shell for every number; the browser reads the number and key and loads the quote.
 * ensureStatic needs at least one prerendered number; others are generated the first time someone opens them.
 */
export function generateStaticParams() {
  return [{ number: `${KALYANI.prefix}-0001` }];
}

export const metadata: Metadata = {
  title: { absolute: `Quotation | ${KALYANI.name}` },
  description: `A quotation from ${KALYANI.name}, ${KALYANI.city}.`,
};

export default function QuotePage() {
  return (
    <main className="min-h-dvh bg-canvas py-6 font-sans text-ink sm:py-12 print:bg-white print:py-0">
      <Suspense fallback={<p className="py-16 text-center text-muted">Loading the quote…</p>}>
        <PublicQuote />
      </Suspense>
    </main>
  );
}
