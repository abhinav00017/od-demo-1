import type { Mock } from "@/lib/schema";
import { BrowserFrame } from "./Frames";

type Site = Extract<Mock, { kind: "browser" }>;

function Cup() {
  return (
    <svg viewBox="0 0 120 120" className="size-24 shrink-0 sm:size-28" aria-hidden>
      <circle cx="60" cy="60" r="56" className="fill-cafe-clay" />
      <path d="M32 50h48v22a20 20 0 0 1-20 20h-8a20 20 0 0 1-20-20Z" className="fill-cafe-crema" />
      <path d="M80 56h6a9 9 0 0 1 0 18h-7" fill="none" className="stroke-cafe-crema" strokeWidth="6" />
      <path d="M46 26c-4 6 4 10 0 16M58 22c-4 6 4 10 0 16M70 26c-4 6 4 10 0 16" fill="none" className="stroke-cafe-crema" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function BrowserMock({ mock }: { mock: Site }) {
  return (
    <BrowserFrame url={mock.url}>
      <div className="flex items-center justify-between bg-cafe-espresso px-5 py-3 text-cafe-crema">
        <span className="font-bold">{mock.name}</span>
        <span className="hidden gap-4 text-xs font-semibold sm:flex">
          <span>Menu</span>
          <span>Visit</span>
          <span>Order</span>
        </span>
      </div>
      <div className="flex items-center gap-5 bg-cafe-espresso px-5 pt-4 pb-7 text-cafe-crema">
        <div className="min-w-0 flex-1">
          <p className="text-xl leading-tight font-bold sm:text-2xl">{mock.headline}</p>
          <p className="mt-2 text-sm text-cafe-crema">{mock.sub}</p>
          <span className="mt-4 inline-block rounded-full bg-cafe-crema px-4 py-2 text-sm font-semibold text-cafe-espresso">{mock.cta}</span>
        </div>
        <Cup />
      </div>
      <div className="bg-cafe-crema px-5 py-5">
        <p className="text-sm font-bold tracking-wide text-cafe-espresso uppercase">Today&apos;s favourites</p>
        <ul className="mt-3 divide-y divide-cafe-espresso/10">
          {mock.items.map((item) => (
            <li key={item.name} className="flex justify-between py-2 text-sm text-cafe-espresso">
              <span>{item.name}</span>
              <span className="font-semibold">{item.price}</span>
            </li>
          ))}
        </ul>
      </div>
    </BrowserFrame>
  );
}
