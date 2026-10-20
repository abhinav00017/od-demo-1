import { Bookmark, Globe, Navigation, Phone, Share2, Star } from "lucide-react";
import type { Mock } from "@/lib/schema";
import { PhoneFrame } from "./Frames";

type Maps = Extract<Mock, { kind: "maps" }>;

const PHOTO: Record<Maps["photos"][number], string> = {
  teal: "bg-lotus-teal",
  sand: "bg-lotus-sand",
  rose: "bg-lotus-rose",
  espresso: "bg-cafe-espresso",
  crema: "bg-cafe-crema",
  clay: "bg-cafe-clay",
};

function MiniMap() {
  return (
    <svg viewBox="0 0 320 120" className="block h-28 w-full" aria-hidden>
      <rect width="320" height="120" className="fill-g-map" />
      <path d="M0 92 C 60 80, 120 110, 200 96 S 300 70, 320 78 L320 120 L0 120Z" className="fill-g-water" />
      <rect x="208" y="10" width="70" height="44" rx="8" className="fill-g-park" />
      <path d="M0 40 H320 M90 0 V120 M0 70 L320 52 M190 0 L230 120" className="stroke-g-road" strokeWidth="7" fill="none" />
      <g transform="translate(150 22)">
        <path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 40 14 40s14-16 14-26.3C28 6.1 21.7 0 14 0Z" className="fill-lotus-rose" />
        <circle cx="14" cy="13.5" r="5" className="fill-white" />
      </g>
    </svg>
  );
}

export function MapsMock({ mock }: { mock: Maps }) {
  const actions = [
    { label: "Directions", Icon: Navigation, filled: true },
    { label: "Call", Icon: Phone },
    { label: "Website", Icon: Globe },
    { label: "Save", Icon: Bookmark },
    { label: "Share", Icon: Share2 },
  ];
  return (
    <PhoneFrame>
      <div className="px-3 pt-1 pb-2">
        <div className="rounded-full bg-white px-4 py-2.5 text-sm text-g-sub shadow ring-1 ring-g-map">
          {mock.category.toLowerCase()} near me
        </div>
      </div>
      <MiniMap />
      <div className="rounded-t-2xl bg-white px-4 pt-3 pb-5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <span aria-hidden className="mx-auto block h-1 w-10 rounded-full bg-line" />
        <div aria-hidden className="mt-3 grid grid-cols-3 gap-1.5">
          {mock.photos.map((p, i) => (
            <span key={i} className={`h-16 rounded-lg ${PHOTO[p]} ${i === 0 ? "rounded-l-xl" : ""} ${i === 2 ? "rounded-r-xl" : ""}`} />
          ))}
        </div>
        <p className="mt-3 text-lg leading-tight font-semibold text-g-text">{mock.name}</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-g-text">
          {mock.rating.toFixed(1)}
          <span role="img" className="flex text-g-star" aria-label={`${mock.rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} aria-hidden className="size-3.5 fill-current" />
            ))}
          </span>
          <span className="text-g-sub">({mock.reviews})</span>
        </p>
        <p className="text-sm text-g-sub">
          {mock.category} · {mock.area}
        </p>
        <p className="text-sm">
          <span className="font-semibold text-g-green">{mock.openLine}</span>
          <span className="text-g-sub"> · {mock.closesLine}</span>
        </p>
        <div className="mt-3 flex gap-2 overflow-hidden">
          {actions.map(({ label, Icon, filled }) => (
            <span
              key={label}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                filled ? "bg-g-blue text-white" : "text-g-blue ring-1 ring-g-map"
              }`}
            >
              <Icon aria-hidden className="size-3.5" />
              {label}
            </span>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-canvas p-3">
          <p className="flex items-center gap-2 text-xs">
            <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-g-blue text-[11px] font-bold text-white">
              {mock.review.author.charAt(0)}
            </span>
            <span className="font-semibold text-g-text">{mock.review.author}</span>
            <span className="text-g-sub">· {mock.review.when}</span>
          </p>
          <p className="mt-2 text-[13px] leading-snug text-g-text">“{mock.review.text}”</p>
        </div>
      </div>
    </PhoneFrame>
  );
}
