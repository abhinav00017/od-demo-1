import { Ticket } from "lucide-react";

/** The ShowSalsa logo: a tilted ticket in a rose-to-purple tab, then "show" in white and "salsa" in amber. */
export function Wordmark({ className = "text-xl" }: { className?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-flex h-7 w-6 items-center justify-center rounded-sm bg-linear-to-b from-wing-rose to-wing-purple text-white shadow-sm">
        <Ticket aria-hidden className="h-3.5 w-3.5 -rotate-12" />
      </span>
      <span className={`font-wing-display font-extrabold tracking-tight text-white ${className}`}>
        show<span className="text-wing-amber">salsa</span>
      </span>
    </span>
  );
}
