/** The purple full stop from the logo, used as a small motif. */
export function Dot({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full bg-brand ${className}`} />;
}
