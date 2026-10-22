import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { clinic } from "./data";
import { PillLink } from "./Motion";
import { ui } from "./ui";

/** Google Maps embed. No API key: the public `output=embed` URL. */
export function mapEmbedUrl(query: string = clinic.mapQuery) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/** Opens Google Maps (app or site) on the clinic, where the visitor can ask for directions. */
export function directionsUrl(query: string = clinic.mapQuery) {
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
}

export function ClinicMap({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-hidden ${ui.card} ${className}`}>
      <iframe
        title={`Map showing ${clinic.name}, ${clinic.mapQuery}`}
        src={mapEmbedUrl()}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block h-full min-h-72 w-full border-0"
      />
    </div>
  );
}

export function DirectionsLink({ className = "" }: { className?: string }) {
  return (
    <PillLink href={directionsUrl()} external arrow className={`${ui.secondaryArrow} ${className}`}>
      <span className="inline-flex items-center gap-2">
        <Navigation aria-hidden strokeWidth={1.75} className="size-4" />
        Get Directions
        <span className="sr-only">(opens Google Maps in a new tab)</span>
      </span>
    </PillLink>
  );
}

/** Address, hours and phone (and email on the contact page) beside a live map. Used on the home page and the contact page. */
export function VisitBlock({ withEmail = false, children }: { withEmail?: boolean; children?: ReactNode }) {
  const rows = [
    { Icon: MapPin, title: "Address", lines: clinic.address },
    { Icon: Clock, title: "Hours", lines: clinic.hours.map((h) => `${h.days}: ${h.time}`) },
    { Icon: Phone, title: "Phone and WhatsApp", lines: [clinic.phone] },
    ...(withEmail ? [{ Icon: Mail, title: "Email", lines: [clinic.email] }] : []),
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr] lg:gap-8">
      <div className={`p-6 sm:p-8 ${ui.card}`}>
        <dl className="space-y-5">
          {rows.map(({ Icon, title, lines }) => (
            <div key={title} className="flex gap-3.5">
              <Icon aria-hidden strokeWidth={1.5} className="mt-0.5 size-5 shrink-0 text-lotus-accent" />
              <div>
                <dt className="font-semibold text-lotus-text">{title}</dt>
                {lines.map((l) => (
                  <dd key={l} className="mt-0.5">
                    {l}
                  </dd>
                ))}
              </div>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          {children}
          <DirectionsLink className="w-full sm:w-auto" />
        </div>
      </div>
      <ClinicMap />
    </div>
  );
}
