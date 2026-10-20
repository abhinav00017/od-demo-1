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

export function HeroArt() {
  return (
    <svg viewBox="0 0 480 480" className="h-auto w-full" aria-hidden>
      <circle cx="240" cy="240" r="220" className="fill-lotus-sand" />
      <path d="M110 420V230a130 130 0 0 1 260 0v190Z" className="fill-lotus-teal" />
      <path d="M150 420V240a90 90 0 0 1 180 0v180Z" className="fill-lotus-teal-deep" />
      <g transform="translate(240 300)">
        <path d="M0-120c26 30 32 76 0 128-32-52-26-98 0-128Z" className="fill-lotus-mint" />
        <path d="M-92-64c44 2 78 30 92 72-46 8-84-20-92-72Z" className="fill-lotus-mint" opacity=".85" />
        <path d="M92-64c-44 2-78 30-92 72 46 8 84-20 92-72Z" className="fill-lotus-mint" opacity=".85" />
        <path d="M-84 44q21-12 42 0t42 0 42 0 42 0" fill="none" className="stroke-lotus-mint" strokeWidth="8" strokeLinecap="round" opacity=".7" />
      </g>
      <circle cx="384" cy="118" r="26" className="fill-lotus-rose" />
      <circle cx="92" cy="150" r="12" className="fill-lotus-teal" />
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

export function MapArt() {
  return (
    <svg viewBox="0 0 600 360" className="h-auto w-full" aria-hidden>
      <rect width="600" height="360" className="fill-lotus-mint" />
      <path d="M0 290 C 120 250, 250 330, 380 300 S 560 240, 600 260 L600 360 L0 360Z" className="fill-lotus-teal" opacity=".35" />
      <path d="M0 120 H600 M180 0 V360 M0 220 L600 170 M420 0 L460 360" className="stroke-white" strokeWidth="14" fill="none" />
      <rect x="470" y="30" width="100" height="70" rx="12" className="fill-lotus-sand" />
      <g transform="translate(272 96)">
        <path d="M28 0C12.5 0 0 12.3 0 27.5 0 48 28 80 28 80s28-32 28-52.5C56 12.3 43.5 0 28 0Z" className="fill-lotus-rose" />
        <circle cx="28" cy="27" r="10" className="fill-white" />
      </g>
    </svg>
  );
}
