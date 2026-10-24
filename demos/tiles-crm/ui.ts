/** Class strings the CRM screens share. White, hub ink, one terracotta accent. */
export const ui = {
  card: "rounded-2xl bg-white ring-1 ring-line",
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-crm-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-crm-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-accent disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-crm-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-accent disabled:cursor-not-allowed disabled:opacity-60",
  quiet:
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-crm-accent transition hover:bg-crm-soft focus-visible:outline-2 focus-visible:outline-crm-accent disabled:opacity-60",
  label: "block text-sm font-semibold text-ink",
  // 16px text so phones do not zoom in on focus.
  input:
    "mt-1.5 block w-full rounded-xl bg-white px-3.5 py-2.5 text-base text-ink ring-1 ring-crm-field placeholder:text-muted focus:ring-2 focus:ring-crm-accent focus:outline-none aria-invalid:ring-2 aria-invalid:ring-crm-error",
  error: "mt-1.5 text-sm font-semibold text-crm-error",
  h2: "text-lg font-bold tracking-tight text-ink",
  muted: "text-sm text-muted",
};
