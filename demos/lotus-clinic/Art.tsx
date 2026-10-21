/** Placeholder art for the Lotus demo: shapes and type only, no people. */

export function LotusMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M24 8c5 6 6 14 0 24-6-10-5-18 0-24Z" className="fill-lotus-forest" />
      <path d="M8 18c8 0 14 5 16 14-9 1-15-4-16-14Z" className="fill-lotus-forest" opacity=".55" />
      <path d="M40 18c-8 0-14 5-16 14 9 1 15-4 16-14Z" className="fill-lotus-forest" opacity=".55" />
      <path d="M11 38h26" fill="none" className="stroke-lotus-forest" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Stands in for a portrait photo until the clinic sends one. */
export function DoctorCard({ initials, className = "" }: { initials: string; className?: string }) {
  return (
    <div aria-hidden className={`flex aspect-[5/4] flex-col sm:aspect-[4/5] justify-between rounded-lg bg-lotus-stone p-6 sm:p-8 ${className}`}>
      <LotusMark className="size-6" />
      <span className="font-lotus-serif text-[7rem] leading-none tracking-[-0.04em] text-lotus-forest sm:text-[9rem]">{initials}</span>
    </div>
  );
}
