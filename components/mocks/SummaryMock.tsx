import type { Mock } from "@/lib/schema";
import { ChatShell } from "./ChatMock";

type Summary = Extract<Mock, { kind: "summary" }>;

export function SummaryMock({ mock }: { mock: Summary }) {
  const max = Math.max(...mock.hours.map((h) => h.value));
  return (
    <ChatShell contact={`${mock.name} reports`} status="Sent every night at 11 pm">
      <div className="flex justify-start">
        <div className="w-[92%] rounded-lg rounded-tl-none bg-wa-in p-3 text-wa-text shadow-sm">
          <p className="text-xs font-semibold text-wa-time">Today · {mock.date}</p>
          <p className="mt-1 text-2xl font-bold">{mock.total}</p>
          <p className="text-xs font-semibold text-g-green">{mock.change}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md bg-wa-bg py-2">
              <p className="text-base font-bold">{mock.orders}</p>
              <p className="text-[11px] text-wa-time">orders</p>
            </div>
            <div className="rounded-md bg-wa-bg py-2">
              <p className="text-base font-bold">{mock.average}</p>
              <p className="text-[11px] text-wa-time">per order</p>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold">Orders by hour</p>
          <div className="mt-2 flex h-20 items-end gap-1.5" aria-hidden>
            {mock.hours.map((h) => (
              <span key={h.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="w-full rounded-t bg-wa-header" style={{ height: `${Math.round((h.value / max) * 56) + 4}px` }} />
                <span className="text-[9px] text-wa-time">{h.label}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold">Best sellers</p>
          <ol className="mt-1 space-y-0.5 text-[13px]">
            {mock.top.map((t, i) => (
              <li key={t.name} className="flex justify-between">
                <span>
                  {i + 1}. {t.name}
                </span>
                <span className="font-semibold">{t.count}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-right text-[10px] text-wa-time">11:00 pm</p>
        </div>
      </div>
    </ChatShell>
  );
}
