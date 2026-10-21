/** Shared Lotus class names, so every page draws cards and buttons the same way. */
export const ui = {
  card: "rounded-3xl bg-white ring-1 ring-lotus-hairline shadow-lotus",
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-lotus-accent px-6 py-3 font-semibold text-white transition hover:bg-lotus-accent-hover",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-lotus-text ring-1 ring-lotus-hairline transition hover:ring-lotus-accent hover:text-lotus-accent",
  input:
    "mt-2 block min-h-12 w-full rounded-xl border-0 bg-white px-4 py-3 text-base text-lotus-text ring-1 ring-lotus-field placeholder:text-lotus-muted focus:ring-2 focus:ring-lotus-accent focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-lotus-error",
  h2: "text-2xl font-semibold tracking-tight text-lotus-text sm:text-3xl",
  section: "py-10 sm:py-14 lg:py-16",
  /** A section that follows another: no top padding, so two sections never stack their gaps. */
  sectionNext: "pb-10 sm:pb-14 lg:pb-16",
};
