import type { Mock } from "@/lib/schema";
import { PhoneFrame } from "./Frames";

type QrMenu = Extract<Mock, { kind: "qr-menu" }>;

const SIZE = 25;

/** A QR-like pattern: three finder squares and a fixed pseudo-random fill. It does not scan. */
function FakeQr({ seed }: { seed: string }) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const next = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= SIZE - 8 && y < 8) || (x < 8 && y >= SIZE - 8);
  const cells: [number, number][] = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!inFinder(x, y) && next() > 0.52) cells.push([x, y]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" className="fill-cafe-espresso" />
      <rect x={x + 1} y={y + 1} width="5" height="5" className="fill-white" />
      <rect x={x + 2} y={y + 2} width="3" height="3" className="fill-cafe-espresso" />
    </g>
  );
  return (
    <svg viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`} className="size-40" aria-hidden shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={SIZE + 4} height={SIZE + 4} className="fill-white" />
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" className="fill-cafe-espresso" />
      ))}
      {finder(0, 0)}
      {finder(SIZE - 7, 0)}
      {finder(0, SIZE - 7)}
    </svg>
  );
}

export function QrMenuMock({ mock }: { mock: QrMenu }) {
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
      <div className="mx-auto flex w-52 flex-col items-center rounded-3xl bg-cafe-espresso px-5 pt-5 pb-6 text-center shadow-xl">
        <p className="text-sm font-bold text-cafe-crema">{mock.name}</p>
        <div className="mt-3 rounded-2xl bg-white p-2">
          <FakeQr seed={mock.name + mock.table} />
        </div>
        <p className="mt-3 text-sm font-semibold text-cafe-crema">Scan for the menu</p>
        <p className="text-xs text-cafe-crema">{mock.table}</p>
      </div>
      <PhoneFrame className="max-w-[300px]">
        <div className="bg-cafe-crema px-4 pt-2 pb-5">
          <p className="text-xs font-semibold text-cafe-body">{mock.table}</p>
          <p className="text-lg font-bold text-cafe-espresso">{mock.name}</p>
          <div aria-hidden className="mt-3 flex gap-2">
            {mock.sections.map((s, i) => (
              <span
                key={s.title}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${i === 0 ? "bg-cafe-espresso text-cafe-crema" : "bg-white text-cafe-espresso"}`}
              >
                {s.title}
              </span>
            ))}
          </div>
          {mock.sections.map((s) => (
            <div key={s.title} className="mt-4">
              <p className="text-xs font-bold tracking-wide text-cafe-body uppercase">{s.title}</p>
              <ul className="mt-2 space-y-2">
                {s.items.map((item) => (
                  <li key={item.name} className="flex items-center gap-3 rounded-xl bg-white p-2.5">
                    <span aria-hidden className="size-10 shrink-0 rounded-lg bg-cafe-clay/80" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-cafe-espresso">
                        <span role="img" aria-label="Vegetarian" className="flex size-3 items-center justify-center border border-g-green">
                          <span className="size-1.5 rounded-full bg-g-green" />
                        </span>
                        {item.name}
                      </span>
                      {item.note ? <span className="text-xs font-semibold text-cafe-clay">{item.note}</span> : null}
                    </span>
                    <span className="text-sm font-semibold text-cafe-espresso">{item.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PhoneFrame>
    </div>
  );
}
