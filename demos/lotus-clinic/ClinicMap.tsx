import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { clinic } from "./data";

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
    <div className={`overflow-hidden rounded-3xl bg-lotus-mint ring-1 ring-lotus-line ${className}`}>
      <iframe
        title={`Map showing ${clinic.name}, ${clinic.mapQuery}`}
        src={mapEmbedUrl()}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block h-full min-h-80 w-full border-0"
      />
    </div>
  );
}

export function DirectionsLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={directionsUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-lotus-teal ring-2 ring-lotus-teal transition hover:bg-lotus-mint ${className}`}
    >
      <Navigation aria-hidden className="size-5" />
      Get directions
      <span className="sr-only">(opens Google Maps in a new tab)</span>
    </a>
  );
}

/** Address, hours and phone beside a live map. Used on the home page and the contact page. */
export function VisitBlock() {
  const rows = [
    { Icon: MapPin, title: "Address", lines: clinic.address },
    { Icon: Clock, title: "Hours", lines: clinic.hours.map((h) => `${h.days}: ${h.time}`) },
    { Icon: Phone, title: "Phone and WhatsApp", lines: [clinic.phone] },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <div className="rounded-3xl bg-white p-7 ring-1 ring-lotus-line">
        <dl className="space-y-6">
          {rows.map(({ Icon, title, lines }) => (
            <div key={title} className="flex gap-4">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-lotus-mint text-lotus-teal">
                <Icon className="size-5" />
              </span>
              <div>
                <dt className="font-semibold text-lotus-ink">{title}</dt>
                {lines.map((l) => (
                  <dd key={l} className="mt-0.5">
                    {l}
                  </dd>
                ))}
              </div>
            </div>
          ))}
        </dl>
        <DirectionsLink className="mt-8 w-full sm:w-auto" />
      </div>
      <ClinicMap />
    </div>
  );
}
