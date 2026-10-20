import { FileText, ShieldCheck } from "lucide-react";
import type { Mock } from "@/lib/schema";
import { BrowserFrame } from "./Frames";

type Records = Extract<Mock, { kind: "records" }>;

export function RecordsMock({ mock }: { mock: Records }) {
  return (
    <BrowserFrame url="Clinic records · Patients">
      <div className="bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-lotus-mint font-bold text-lotus-teal-deep">
            {mock.patient.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lotus-ink">{mock.patient}</p>
            <p className="text-sm text-lotus-body">{mock.meta}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-lotus-mint px-2.5 py-1 text-xs font-semibold text-lotus-teal-deep">
            <ShieldCheck aria-hidden className="size-3.5" />
            Consent given
          </span>
        </div>
        <ol className="mt-6 space-y-5 border-l-2 border-lotus-line pl-5">
          {mock.visits.map((v) => (
            <li key={v.date} className="relative">
              <span aria-hidden className="absolute top-1.5 -left-[27px] size-3 rounded-full bg-lotus-teal ring-4 ring-white" />
              <p className="text-xs font-semibold text-lotus-body">{v.date}</p>
              <p className="mt-0.5 font-semibold text-lotus-ink">{v.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {v.files.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5 rounded-lg bg-lotus-cream px-2.5 py-1 text-xs font-semibold text-lotus-ink ring-1 ring-lotus-line">
                    <FileText aria-hidden className="size-3.5 text-lotus-teal" />
                    {f}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <span className="mt-6 block rounded-xl bg-lotus-teal py-2.5 text-center text-sm font-semibold text-white">
          Send latest report on WhatsApp
        </span>
      </div>
    </BrowserFrame>
  );
}
