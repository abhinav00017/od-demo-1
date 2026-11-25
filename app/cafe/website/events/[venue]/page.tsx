import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cafe } from "@/demos/solstice-cafe/data";
import { fromPrice, VENUES, venueById } from "@/demos/solstice-cafe/events";
import { VenuePage } from "@/demos/solstice-cafe/VenuePage";

/**
 * One event venue of the Solstice cafe demo: /cafe/website/events/courtyard and /cafe/website/events/conservatory.
 * The cafe demo itself is a single page in the [industry]/[service] route; its venue pages live here, as the clinic's
 * patient page lives in app/clinic/website/v. Both venues prerender as static pages; any other venue is a 404.
 */
export function generateStaticParams() {
  return VENUES.map((v) => ({ venue: v.id }));
}

export async function generateMetadata({ params }: PageProps<"/cafe/website/events/[venue]">): Promise<Metadata> {
  const venue = venueById((await params).venue);
  if (!venue) return {};
  return {
    title: { absolute: `${venue.name}: parties and small functions | ${cafe.name}` },
    description: `${venue.kind} at ${cafe.name}, Jubilee Hills. Up to ${venue.maxGuests} guests. ${fromPrice(venue)}. Send an enquiry and the cafe confirms the final quote.`,
  };
}

// With Cache Components, params is read inside a Suspense child, never in the page function itself.
export default function VenueRoute({ params }: PageProps<"/cafe/website/events/[venue]">) {
  return (
    <Suspense>
      <Venue params={params} />
    </Suspense>
  );
}

async function Venue({ params }: { params: Promise<{ venue: string }> }) {
  const venue = venueById((await params).venue);
  if (!venue) notFound();
  return <VenuePage venue={venue} hubHref="/cafe" />;
}
