import type { Metadata } from "next";
import { cafe } from "@/demos/solstice-cafe/data";
import { EnquiriesAdmin } from "@/demos/solstice-cafe/EnquiriesAdmin";
import { SolsticeShell } from "@/demos/solstice-cafe/SolsticeSite";

/**
 * The cafe owner's password-protected list of event enquiries. One static shell: the browser asks the API
 * who is looking and loads the list only for a valid cafe_session cookie.
 */
export const metadata: Metadata = {
  title: { absolute: `Event enquiries | ${cafe.name}` },
  robots: { index: false, follow: false },
};

export default function CafeEnquiriesPage() {
  return (
    <SolsticeShell hubHref="/cafe" visitor={false}>
      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8 lg:py-14">
        <EnquiriesAdmin />
      </main>
    </SolsticeShell>
  );
}
