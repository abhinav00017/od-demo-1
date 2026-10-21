/** Placeholder art for the Lotus demo: shapes only, no people. */

export function LotusMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M24 8c5 6 6 14 0 24-6-10-5-18 0-24Z" className="fill-lotus-accent" />
      <path d="M8 18c8 0 14 5 16 14-9 1-15-4-16-14Z" className="fill-lotus-accent" opacity=".55" />
      <path d="M40 18c-8 0-14 5-16 14 9 1 15-4 16-14Z" className="fill-lotus-accent" opacity=".55" />
      <path d="M12 38h24" fill="none" className="stroke-lotus-accent" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** The doctor's portrait slot: initials on a soft teal circle, in a rounded mask. Swap in a photo for a real clinic. */
export function DoctorPortrait({ initials, className = "" }: { initials: string; className?: string }) {
  return (
    <div aria-hidden className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-lotus-hairline ${className}`}>
      <svg viewBox="0 0 320 240" className="h-auto w-full">
        <defs>
          <radialGradient id="lotus-portrait-tint" cx="50%" cy="50%" r="50%">
            <stop offset="0%" className="[stop-color:var(--color-lotus-accent)]" stopOpacity=".16" />
            <stop offset="100%" className="[stop-color:var(--color-lotus-accent)]" stopOpacity=".04" />
          </radialGradient>
        </defs>
        <circle cx="160" cy="120" r="84" fill="url(#lotus-portrait-tint)" />
        <circle cx="160" cy="120" r="84" fill="none" className="stroke-lotus-accent" strokeOpacity=".18" strokeWidth="1" />
        <text x="160" y="140" textAnchor="middle" className="fill-lotus-accent font-sans" fontSize="56" fontWeight="600" letterSpacing="-1">
          {initials}
        </text>
      </svg>
    </div>
  );
}
