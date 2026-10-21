/** Placeholder art for the Lotus demo. The doctor is a flat illustration of a made-up person, never a photo of anyone real. */

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

/** The logo mark drawn as a thin outline. Sits before each home section title. */
export function LotusLineMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`fill-none stroke-lotus-accent ${className}`}
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-lotus-linemark=""
    >
      <path d="M24 8c5 6 6 14 0 24-6-10-5-18 0-24Z" />
      <path d="M8 18c8 0 14 5 16 14-9 1-15-4-16-14Z" />
      <path d="M40 18c-8 0-14 5-16 14 9 1 15-4 16-14Z" />
      <path d="M12 38h24" />
    </svg>
  );
}

const SKIN = "#c68a62";
const SKIN_SHADE = "#b97a55";
const SKIN_DEEP = "#a4684a";
const HAIR = "#2a1b16";
const COAT_LINE = "#d3e4e1";
const SLATE = "#334155";

/** The figure, drawn in a 400 x 500 box and scaled up from the bottom centre so she fills the frame. */
function DoctorFigure() {
  return (
    <g transform="translate(200 500) scale(1.15) translate(-200 -500)">
      <path
        transform="translate(0 24)"
        d="M134 246C128 180 164 158 200 158C240 158 274 180 266 246C262 290 268 328 286 356C264 370 240 372 222 366L178 366C160 372 136 370 114 356C132 328 138 290 134 246Z"
        fill={HAIR}
      />
      <path d="M179 320L179 382L200 418L221 382L221 320Z" fill={SKIN_SHADE} />
      <path d="M179 326Q200 354 221 326L221 346Q200 366 179 346Z" fill={SKIN_DEEP} />
      {/* Teal scrubs under a white coat */}
      <path d="M142 388Q166 378 182 378L200 416L218 378Q234 378 258 388L270 500L130 500Z" className="fill-lotus-accent" />
      <path d="M54 500C56 438 92 398 152 384L182 378L160 452L166 500Z" fill="#ffffff" />
      <path d="M346 500C344 438 308 398 248 384L218 378L240 452L234 500Z" fill="#ffffff" />
      <path d="M182 378L150 414L160 452M218 378L250 414L240 452" fill="none" stroke={COAT_LINE} strokeWidth="2" strokeLinejoin="round" />
      <rect x="88" y="452" width="40" height="34" rx="4" fill="none" stroke={COAT_LINE} strokeWidth="2" />
      <rect x="262" y="438" width="44" height="13" rx="3" className="fill-lotus-accent" opacity=".85" />
      {/* Stethoscope */}
      <path
        d="M168 386C156 428 170 460 200 464C230 460 244 428 232 386M214 461C226 470 232 478 234 488"
        fill="none"
        stroke={SLATE}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="235" cy="493" r="9" fill="#cbd5e1" stroke={SLATE} strokeWidth="3" />
      <g transform="translate(0 24)">
        <ellipse cx="146" cy="258" rx="10" ry="13" fill={SKIN_SHADE} />
        <ellipse cx="254" cy="258" rx="10" ry="13" fill={SKIN_SHADE} />
        <circle cx="146" cy="273" r="3.5" fill="#d4a24c" />
        <circle cx="254" cy="273" r="3.5" fill="#d4a24c" />
        <ellipse cx="200" cy="252" rx="55" ry="67" fill={SKIN} />
        <path d="M144 256C136 196 168 174 204 174C240 174 266 200 257 256C250 226 234 206 214 198C196 222 172 236 144 256Z" fill={HAIR} />
        <path d="M167 238Q178 231 189 236M211 236Q222 231 233 238" fill="none" stroke={HAIR} strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="178" cy="254" rx="4.5" ry="5.5" fill="#1f1512" />
        <ellipse cx="222" cy="254" rx="4.5" ry="5.5" fill="#1f1512" />
        <path d="M200 260Q195 276 203 279" fill="none" stroke={SKIN_DEEP} strokeWidth="3" strokeLinecap="round" />
        <path d="M185 293Q200 304 215 293" fill="none" stroke="#8f3f35" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="165" cy="280" r="9" fill="#e08e74" opacity=".35" />
        <circle cx="235" cy="280" r="9" fill="#e08e74" opacity=".35" />
      </g>
    </g>
  );
}

/**
 * The doctor's portrait slot: a flat illustration on a soft teal backdrop, until the clinic sends a real photo.
 * `portrait` fills a 4:5 box; `avatar` crops to the head and shoulders for a round frame.
 */
export function DoctorIllustration({ label, variant = "portrait", className = "" }: { label: string; variant?: "portrait" | "avatar"; className?: string }) {
  const viewBox = variant === "portrait" ? "0 0 400 500" : "60 120 280 280";
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} data-portrait={variant} className={className}>
      <rect x="0" y="0" width="400" height="500" fill="#eef6f5" />
      <circle cx="200" cy="245" r="165" fill="#dcedea" />
      {variant === "portrait" ? <circle cx="318" cy="96" r="70" fill="#e4f1ef" /> : null}
      <DoctorFigure />
    </svg>
  );
}

/** Google's "G", for the rating. Decorative: the text beside it says "Google rating". */
export function GoogleG({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden data-google-g="">
      <path fill="#FBBC05" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9Z" />
      <path fill="#EA4335" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#34A853" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
      <path fill="#4285F4" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9Z" />
    </svg>
  );
}

/** Five amber stars. Decorative: the rating is in the text. */
export function Stars({ className = "size-3.5" }: { className?: string }) {
  return (
    <span aria-hidden data-stars="" className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className={className}>
          <path
            fill="#F59E0B"
            d="M10 1.6l2.5 5.4 5.9.6-4.4 4 1.3 5.8L10 14.5l-5.3 2.9L6 11.6l-4.4-4 5.9-.6L10 1.6Z"
          />
        </svg>
      ))}
    </span>
  );
}
