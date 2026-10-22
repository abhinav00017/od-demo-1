const OUTLINE =
  "inline-flex items-center justify-center rounded-full bg-white font-semibold text-lotus-accent ring-1 ring-lotus-accent transition-[color,background-color,box-shadow] hover:bg-lotus-tint hover:text-lotus-accent-hover";

/** Shared Lotus class names, so every page draws cards and buttons the same way. */
export const ui = {
  card: "rounded-3xl bg-white ring-1 ring-lotus-hairline shadow-lotus",
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-lotus-accent px-6 py-3 font-semibold text-white transition-[color,background-color,box-shadow] hover:bg-lotus-accent-hover",
  /** An outline pill with even padding. */
  secondary: `${OUTLINE} gap-2 px-6 py-3`,
  /** An outline pill that ends in an ArrowCircle: same 48px height as `primary`. */
  secondaryArrow: `${OUTLINE} gap-3 py-1.5 pr-1.5 pl-6`,
  input:
    "mt-2 block min-h-12 w-full rounded-xl border-0 bg-white px-4 py-3 text-base text-lotus-text ring-1 ring-lotus-field placeholder:text-lotus-muted focus:ring-2 focus:ring-lotus-accent focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-lotus-error",
  /**
   * The hover shadow of a content or link card. The 3px lift itself is motion (RevealItem `lift`), so CSS never
   * transitions transform or opacity on these cards. Not for forms or the dashboard.
   */
  lift: "transition-shadow duration-200 hover:shadow-lotus-lift",
  /** Page headlines: extra bold, tight tracking. */
  h1: "font-extrabold tracking-[-0.03em] text-lotus-text",
  h2: "text-3xl font-bold tracking-tight text-lotus-text sm:text-4xl",
  /** Airy section padding. Each home section has its own band, so sections never share a gap. */
  section: "py-14 sm:py-20 lg:py-24",
};
