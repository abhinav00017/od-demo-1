/** Small art for the Lotus demo: the logo and the rating marks. No photos or drawings of people. The pill arrow is in Motion.tsx. */

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
