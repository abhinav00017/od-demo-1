import { Mic, PhoneOff, Video } from "lucide-react";
import type { Mock } from "@/lib/schema";
import { PhoneFrame } from "./Frames";

type VideoData = Extract<Mock, { kind: "video" }>;

function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/, "")
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2);
}

export function VideoMock({ mock }: { mock: VideoData }) {
  return (
    <PhoneFrame>
      <div className="px-4 pt-2 pb-4">
        <p className="text-xs font-semibold tracking-wide text-lotus-teal uppercase">Online consultation</p>
        <p className="mt-1 text-lg font-semibold text-lotus-ink">{mock.doctor}</p>
        <p className="text-sm text-lotus-body">
          Video or phone · {mock.fee} · 15 min
        </p>
        <p className="mt-4 text-sm font-semibold text-lotus-ink">{mock.day}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {mock.slots.map((s) => {
            const chosen = s.time === mock.chosen;
            return (
              <span
                key={s.time}
                className={`rounded-lg py-2 text-center text-xs font-semibold ${
                  chosen
                    ? "bg-lotus-teal text-white"
                    : s.taken
                      ? "bg-chip text-muted line-through"
                      : "bg-white text-lotus-teal ring-1 ring-lotus-teal"
                }`}
              >
                {s.time}
              </span>
            );
          })}
        </div>
        <span className="mt-4 block rounded-xl bg-lotus-teal py-3 text-center text-sm font-semibold text-white">
          Pay {mock.fee} with UPI and book
        </span>
      </div>
      <div className="bg-lotus-teal-deep px-4 pt-4 pb-5 text-white">
        <p className="text-xs text-white/85">Your call · {mock.day}, {mock.chosen}</p>
        <div className="relative mt-3 flex h-40 items-center justify-center rounded-2xl bg-lotus-teal">
          <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-lotus-mint text-xl font-bold text-lotus-teal-deep">
            {initials(mock.doctor)}
          </span>
          <span className="absolute bottom-2 left-3 text-xs font-semibold">{mock.doctor}</span>
          <span
            aria-hidden
            className="absolute right-2 bottom-2 flex h-14 w-11 items-center justify-center rounded-lg bg-lotus-sand text-xs font-bold text-lotus-ink"
          >
            {mock.patient.charAt(0)}
          </span>
        </div>
        <div aria-hidden className="mt-4 flex justify-center gap-4">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/15">
            <Mic className="size-5" />
          </span>
          <span className="flex size-11 items-center justify-center rounded-full bg-white/15">
            <Video className="size-5" />
          </span>
          <span className="flex size-11 items-center justify-center rounded-full bg-lotus-rose">
            <PhoneOff className="size-5" />
          </span>
        </div>
      </div>
    </PhoneFrame>
  );
}
