import type { ReactNode } from "react";

/** A phone outline. The screen is white unless the child paints it. */
export function PhoneFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[340px] rounded-[2.6rem] bg-ink p-2.5 shadow-xl ${className}`}>
      <div className="relative overflow-hidden rounded-[2.1rem] bg-white">
        <div className="flex items-center justify-between bg-transparent px-6 pt-3 pb-1 text-[11px] font-semibold text-wa-text">
          <span>9:41</span>
          <span aria-hidden className="h-5 w-20 rounded-full bg-ink" />
          <span aria-hidden className="flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-sm border border-wa-text" />
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A browser window with a URL bar. */
export function BrowserFrame({ url, children, className = "" }: { url: string; children: ReactNode; className?: string }) {
  return (
    <div className={`w-full overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-line ${className}`}>
      <div className="flex items-center gap-3 border-b border-line bg-canvas px-4 py-3">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-full bg-white px-3 py-1 text-xs text-muted ring-1 ring-line">{url}</span>
      </div>
      {children}
    </div>
  );
}
