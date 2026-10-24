"use client";

import { ArrowUpRight, Banknote, Calculator, CheckCircle2, QrCode, Zap } from "lucide-react";
import { useState } from "react";
import { estimateOrganizerPayout, formatINR, site } from "./data";

const PERKS = [
  {
    number: "01.",
    title: "Go Live in 5 Mins",
    description: "Launch multi-tier fanpits, couple cover passes, and early-bird drops in minutes with zero onboarding paperwork.",
    metric: "Avg. Setup: 4m 12s",
    icon: Zap,
    accent: "text-wing-rose",
  },
  {
    number: "02.",
    title: "48-Hour Payouts",
    description: "Automated T+2 NEFT/RTGS bank settlements directly to your organizer account with downloadable GST reconciliation.",
    metric: "97.5% Direct Settlement",
    icon: Banknote,
    accent: "text-wing-amber",
  },
  {
    number: "03.",
    title: "QR Gate Management",
    description: "Sub-second encrypted QR scanning with offline sync, VIP table check-ins, and live turnstile telemetry across multiple gates.",
    metric: "0.3s Gate Scan Speed",
    icon: QrCode,
    accent: "text-wing-orchid",
  },
];

/** "Partner with us": the organiser pitch, three perks and the 48-hour payout calculator. */
export function PartnerBanner({ onOpenListEventModal }: { onOpenListEventModal: () => void }) {
  const [avgPrice, setAvgPrice] = useState(1499);
  const [attendees, setAttendees] = useState(500);
  const payout = estimateOrganizerPayout(avgPrice, attendees);

  return (
    <section id="partner-with-us" aria-labelledby="partner-heading" className="mx-auto max-w-[1400px] scroll-mt-28 px-4 py-12 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-wing-partner-from via-wing-panel to-wing-partner-to p-6 shadow-2xl sm:p-10 lg:p-12">
        <div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-10 lg:flex-row lg:items-end">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-wing-amber">
              <span>{site.name} for Organizers, Clubs & Promoters</span>
              <span aria-hidden="true">·</span>
              <span className="text-wing-zinc-400">Trusted by 850+ Venues Across India</span>
            </div>
            <h2 id="partner-heading" className="text-2xl font-extrabold tracking-tight text-balance text-white sm:text-4xl">
              Built for Sold-Out Arenas & Effortless Gate Operations
            </h2>
            <p className="text-sm leading-relaxed text-wing-zinc-300 sm:text-base">
              From underground warehouse raves in Mumbai to 10,000-capacity college fests and comedy tours—power your ticketing with India’s
              fastest B2B event console.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenListEventModal}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-linear-to-r from-wing-rose to-wing-violet px-6 py-3.5 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-wing-rose/25 transition-all hover:from-wing-rose-light hover:to-wing-violet-light"
            >
              <span>Start Listing in 5 Mins</span>
              <ArrowUpRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-b border-white/10 py-10 md:grid-cols-3">
          {PERKS.map((perk) => {
            const Icon = perk.icon;
            return (
              <div key={perk.title} className="flex flex-col justify-between space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-wing-zinc-400 tabular-nums">{perk.number}</span>
                    <Icon aria-hidden className={`h-5 w-5 ${perk.accent}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white">{perk.title}</h3>
                  <p className="text-xs leading-relaxed text-wing-zinc-400 sm:text-sm">{perk.description}</p>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs text-wing-zinc-300 tabular-nums">
                  <span>Verified Benchmark</span>
                  <span className="font-semibold text-white">{perk.metric}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-center gap-8 pt-8 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Calculator aria-hidden className="h-4 w-4 text-wing-amber" />
              <span>Interactive 48-Hour Organizer Payout Simulator</span>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label htmlFor="avg-ticket-slider" className="text-wing-zinc-400">
                    Average Ticket Price (INR)
                  </label>
                  <span className="font-bold text-white tabular-nums">{formatINR(avgPrice)}</span>
                </div>
                <input
                  id="avg-ticket-slider"
                  type="range"
                  min={299}
                  max={5000}
                  step={100}
                  value={avgPrice}
                  onChange={(e) => setAvgPrice(Number(e.target.value))}
                  className="w-full cursor-pointer accent-wing-rose"
                />
                <div aria-hidden className="flex justify-between text-[11px] text-wing-zinc-500 tabular-nums">
                  <span>₹299</span>
                  <span>₹2,500</span>
                  <span>₹5,000</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label htmlFor="expected-crowd-slider" className="text-wing-zinc-400">
                    Expected Ticket Sales
                  </label>
                  <span className="font-bold text-white tabular-nums">{attendees.toLocaleString("en-IN")} Guests</span>
                </div>
                <input
                  id="expected-crowd-slider"
                  type="range"
                  min={100}
                  max={5000}
                  step={50}
                  value={attendees}
                  onChange={(e) => setAttendees(Number(e.target.value))}
                  className="w-full cursor-pointer accent-wing-violet"
                />
                <div aria-hidden className="flex justify-between text-[11px] text-wing-zinc-500 tabular-nums">
                  <span>100</span>
                  <span>2,500</span>
                  <span>5,000</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/15 bg-wing-night/90 p-5 sm:flex-row sm:items-center lg:col-span-5">
            <div className="space-y-1">
              <span className="text-xs text-wing-zinc-400">Estimated 48-Hr Net Bank Payout</span>
              <div aria-live="polite" className="text-2xl font-extrabold text-wing-amber tabular-nums sm:text-3xl">
                {formatINR(payout.netPayout48Hr)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-wing-emerald-400">
                <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
                <span>Gross Box Office: {formatINR(payout.grossRevenue)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenListEventModal}
              className="cursor-pointer rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/15"
            >
              Create Event Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
