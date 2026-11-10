import type { Metadata } from "next";
import { Suspense } from "react";
import { clinic } from "@/demos/lotus-clinic/data";
import { LotusSite, type Nav } from "@/demos/lotus-clinic/LotusSite";
import { PatientVisit } from "@/demos/lotus-clinic/PatientVisit";

/**
 * The patient's own page, linked from WhatsApp ("View or change"). No login: the browser reads the token from the URL
 * and loads the visit from /api/bookings/view/<token>. One static shell for every token, like the CRM quote page.
 * ensureStatic needs at least one prerendered token; it is not a real one, so that page shows "not valid".
 */
export function generateStaticParams() {
  return [{ token: "sample-visit-link-000000" }];
}

export const metadata: Metadata = {
  title: { absolute: `Your visit | ${clinic.name}` },
  description: `Your visit at ${clinic.name}: day, time, address, and a way to change or cancel it.`,
  robots: { index: false, follow: false },
};

const BASE = "/clinic/website";
/** Same header and footer as the clinic site. "book" hides the phone bar and the floating buttons. */
const nav: Nav = { base: BASE, page: "book", hubHref: "/clinic", href: (p) => (p ? `${BASE}/${p}` : BASE) };

export default function PatientVisitPage() {
  return (
    <LotusSite nav={nav}>
      <Suspense fallback={<p className="py-24 text-center">Loading your visit…</p>}>
        <PatientVisit />
      </Suspense>
    </LotusSite>
  );
}
