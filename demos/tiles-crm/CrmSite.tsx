import Link from "next/link";
import { Suspense } from "react";
import { CrmApp } from "./CrmApp";

/** The demo bar: tells the viewer this is an onlydevs demo and takes them back to the hub. */
function DemoBar({ hubHref }: { hubHref: string }) {
  return (
    <div className="bg-ink text-white print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6 sm:text-sm">
        <p className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-crm-soft" />
          <span className="truncate">
            <span className="font-semibold">onlydevs demo</span>
            <span className="hidden sm:inline"> · a CRM for a made-up tile showroom</span>
          </span>
        </p>
        <Link href={hubHref} className="shrink-0 rounded-full px-2 py-1 font-semibold underline-offset-4 hover:underline">
          ← Back to hub
        </Link>
      </div>
    </div>
  );
}

/**
 * The tile showroom CRM, the Tiles & showrooms live demo. The demo bar is server-rendered; the CRM is one client app
 * behind its own login, with every screen loaded from /api/crm/*. The screen lives in the query string, read in the
 * browser, so the page stays static.
 */
export function CrmSite({ hubHref }: { hubHref: string }) {
  return (
    <div data-site="tiles-crm" className="min-h-dvh bg-canvas font-sans text-ink antialiased">
      <DemoBar hubHref={hubHref} />
      <Suspense fallback={<p className="py-16 text-center text-muted">Loading the CRM…</p>}>
        <CrmApp />
      </Suspense>
    </div>
  );
}
