import type { Mock } from "@/lib/schema";
import { BrowserFrame } from "./Frames";

type Offers = Extract<Mock, { kind: "offers" }>;

export function OffersMock({ mock }: { mock: Offers }) {
  return (
    <BrowserFrame url="Clinic website · Packages">
      <div className="bg-lotus-cream p-5 sm:p-6">
        <p className="font-lotus text-xl font-semibold text-lotus-ink">{mock.heading}</p>
        <div className="mt-4 grid gap-3">
          {mock.items.map((item, i) => (
            <div
              key={item.title}
              className={`rounded-2xl p-4 ${i === 1 ? "bg-lotus-teal text-white" : "bg-white text-lotus-ink ring-1 ring-lotus-line"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{item.title}</p>
                <p className="shrink-0 font-lotus text-lg font-semibold">{item.price}</p>
              </div>
              <p className={`mt-1 text-sm ${i === 1 ? "text-white/90" : "text-lotus-body"}`}>{item.note}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                {item.tag ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      i === 1 ? "bg-white text-lotus-teal-deep" : "bg-lotus-mint text-lotus-teal-deep"
                    }`}
                  >
                    {item.tag}
                  </span>
                ) : (
                  <span />
                )}
                <span className={`text-sm font-semibold ${i === 1 ? "text-white" : "text-lotus-teal"}`}>Book →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}
