/** Placeholder art for the Lotus demo: shapes only, no people. */

export function LotusMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M24 8c5 6 6 14 0 24-6-10-5-18 0-24Z" className="fill-lotus-teal" />
      <path d="M8 18c8 0 14 5 16 14-9 1-15-4-16-14Z" className="fill-lotus-teal" opacity=".75" />
      <path d="M40 18c-8 0-14 5-16 14 9 1 15-4 16-14Z" className="fill-lotus-teal" opacity=".75" />
      <path d="M10 37h28" fill="none" className="stroke-lotus-rose" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function DoctorCard({ initials, className = "" }: { initials: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] bg-lotus-teal ${className}`} aria-hidden>
      <svg viewBox="0 0 400 480" className="h-auto w-full">
        <circle cx="330" cy="70" r="120" className="fill-lotus-teal-deep" />
        <circle cx="40" cy="440" r="140" className="fill-lotus-teal-deep" />
        <circle cx="200" cy="220" r="110" className="fill-lotus-sand" />
        <text x="200" y="250" textAnchor="middle" className="fill-lotus-teal-deep font-lotus" fontSize="84" fontWeight="600">
          {initials}
        </text>
        <path d="M140 392h120" fill="none" className="stroke-lotus-mint" strokeWidth="10" strokeLinecap="round" />
      </svg>
    </div>
  );
}
