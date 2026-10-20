import { Coffee, Gift } from "lucide-react";
import type { Mock } from "@/lib/schema";
import { PhoneFrame } from "./Frames";

type Loyalty = Extract<Mock, { kind: "loyalty" }>;

export function LoyaltyMock({ mock }: { mock: Loyalty }) {
  const left = Math.max(mock.goal - mock.stamps, 0);
  return (
    <PhoneFrame>
      <div className="bg-cafe-crema px-4 pt-2 pb-5">
        <p className="text-xs font-semibold text-cafe-body">Stamp card</p>
        <div className="mt-2 rounded-2xl bg-cafe-espresso p-5 text-cafe-crema shadow-lg">
          <p className="text-sm font-bold">{mock.name}</p>
          <p className="mt-0.5 text-xs">{mock.customer}&apos;s card</p>
          <div role="img" className="mt-4 grid grid-cols-4 gap-2.5" aria-label={`${mock.stamps} of ${mock.goal} stamps`}>
            {Array.from({ length: mock.goal }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className={`flex aspect-square items-center justify-center rounded-full ${
                  i < mock.stamps ? "bg-cafe-crema text-cafe-espresso" : "border-2 border-dashed border-cafe-crema/50"
                }`}
              >
                {i < mock.stamps ? <Coffee className="size-4" /> : i === mock.goal - 1 ? <Gift className="size-4 text-cafe-crema" /> : null}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold">
            {left === 0 ? `Reward ready: ${mock.reward}` : `${left} more for: ${mock.reward}`}
          </p>
        </div>
        <p className="mt-5 text-xs font-bold tracking-wide text-cafe-body uppercase">Your offers</p>
        <ul className="mt-2 space-y-2">
          {mock.offers.map((o) => (
            <li key={o.title} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3">
              <span className="text-sm font-semibold text-cafe-espresso">{o.title}</span>
              <span className="shrink-0 rounded-full bg-cafe-crema px-2.5 py-0.5 text-xs font-semibold text-cafe-espresso">{o.when}</span>
            </li>
          ))}
        </ul>
      </div>
    </PhoneFrame>
  );
}
