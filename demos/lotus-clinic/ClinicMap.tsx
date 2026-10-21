import { ArrowUpRight } from "lucide-react";
import { clinic } from "./data";
import { textLinkClass } from "./ui";

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
    <div className={`overflow-hidden rounded-lg border border-lotus-rule bg-lotus-stone ${className}`}>
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
    <a href={directionsUrl()} target="_blank" rel="noopener noreferrer" className={`${textLinkClass} ${className}`}>
      Get directions
      <ArrowUpRight aria-hidden className="size-4" />
      <span className="sr-only">(opens Google Maps in a new tab)</span>
    </a>
  );
}

/** Address, hours and phone beside a live map. Used on the home page. */
export function VisitBlock() {
  const rows = [
    { title: "Address", lines: clinic.address },
    { title: "Hours", lines: clinic.hours.map((h) => `${h.days}: ${h.time}`) },
    { title: "Phone and WhatsApp", lines: [clinic.phone] },
  ];
  return (
    <div className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
      <div>
        <dl className="divide-y divide-lotus-rule border-y border-lotus-rule">
          {rows.map(({ title, lines }) => (
            <div key={title} className="py-5">
              <dt className="text-[15px] font-medium text-lotus-text">{title}</dt>
              <dd className="mt-1">
                {lines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <DirectionsLink className="mt-8" />
      </div>
      <ClinicMap className="lg:min-h-[26rem]" />
    </div>
  );
}
