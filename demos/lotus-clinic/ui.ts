/**
 * Shared class strings for the Lotus site, so links, buttons and fields look the same on every page.
 * One accent (forest) for actions. Terracotta is for labels and marks only, never buttons. Small radii, hairline rules, no shadows.
 */

/** Primary action: solid forest. Size and disabled look are separate, so callers never pass clashing utilities. */
const buttonCore =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-lotus-forest font-medium text-white transition-colors hover:bg-lotus-forest-deep";
export const buttonSizes = { md: "min-h-11 px-5 py-2.5", lg: "min-h-12 px-6 py-3", sm: "min-h-10 px-4 py-2 text-[15px]" } as const;
const buttonDisabled = "disabled:cursor-not-allowed disabled:bg-lotus-stone disabled:text-lotus-grey";
export const buttonClass = `${buttonCore} ${buttonSizes.md} ${buttonDisabled}`;
export const buttonSmallClass = `${buttonCore} ${buttonSizes.sm} ${buttonDisabled}`;
/** For a submit button that stays dark while it saves. */
export const buttonBusyClass = `${buttonCore} ${buttonSizes.lg} disabled:cursor-wait disabled:bg-lotus-forest-deep`;

/** Secondary action: a text link with an underline that darkens on hover. On the sage band the resting underline uses the sage rule. */
export const textLinkClass =
  "inline-flex items-center gap-1.5 font-medium text-lotus-forest underline decoration-lotus-rule decoration-1 underline-offset-[6px] transition-colors in-[[data-band]]:decoration-lotus-sage-rule hover:decoration-lotus-forest";

/** Text inputs and selects. The edge colour keeps the field boundary at 3:1. */
export const fieldClass =
  "mt-2 block min-h-12 w-full rounded-md border border-lotus-edge bg-white px-3.5 py-3 text-base text-lotus-text placeholder:text-lotus-grey focus:border-lotus-forest focus:ring-1 focus:ring-lotus-forest focus:outline-none aria-[invalid=true]:border-lotus-error aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-lotus-error";

/** The few places that need a surface: the booking form, the login and the dashboard lists. */
export const panelClass = "rounded-lg border border-lotus-rule bg-white";

export const labelClass = "text-[15px] font-medium text-lotus-text";
