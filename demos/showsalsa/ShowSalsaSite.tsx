import Link from "next/link";
import { outfit } from "@/lib/fonts";
import { ShowSalsaApp } from "./ShowSalsaApp";

/** The demo bar: tells the viewer this is an onlydevs demo and takes them back to the hub. */
function DemoBar({ hubHref }: { hubHref: string }) {
  return (
    <div className="relative z-50 bg-ink text-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6 sm:text-sm lg:px-8">
        <p className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-soft" />
          <span className="truncate">
            <span className="font-semibold">onlydevs demo</span>
            <span className="hidden sm:inline"> · a made-up ticketing platform to show what we build</span>
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
 * ShowSalsa, the Ticketing platform live demo: one page. The demo bar is server-rendered; the app (filters, drawers,
 * checkout, list-your-event) is one client tree, as the export was. No URL params are read, so the page is static.
 */
export function ShowSalsaSite({ hubHref }: { hubHref: string }) {
  return (
    <div
      data-site="showsalsa"
      className={`${outfit.variable} min-h-dvh bg-wing-night font-sans text-wing-text antialiased [color-scheme:dark] selection:bg-wing-rose selection:text-white`}
    >
      <DemoBar hubHref={hubHref} />
      <ShowSalsaApp />
    </div>
  );
}
