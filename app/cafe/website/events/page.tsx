import type { Metadata } from "next";
import { cafe } from "@/demos/solstice-cafe/data";
import { EventsSection } from "@/demos/solstice-cafe/EventsSection";
import { SolsticeShell } from "@/demos/solstice-cafe/SolsticeSite";

/** /cafe/website/events: the two venue cards on their own, so the address one level up from a venue page works too. */
export const metadata: Metadata = {
  title: { absolute: `Events and private parties | ${cafe.name}` },
  description: `Book The Courtyard or The Conservatory at ${cafe.name}, Jubilee Hills, for a birthday, a kitty party or a team lunch.`,
};

export default function CafeEventsPage() {
  return (
    <SolsticeShell hubHref="/cafe">
      <main>
        <EventsSection eager />
      </main>
    </SolsticeShell>
  );
}
