import type { Service } from "@/lib/schema";

export const STATUS_LABEL: Record<Service["status"], string> = { live: "Live demo", preview: "Preview" };

export function StatusPill({ status }: { status: Service["status"] }) {
  const live = status === "live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        live ? "bg-brand text-white" : "bg-chip text-ink"
      }`}
    >
      {live ? <span aria-hidden className="size-1.5 rounded-full bg-white" /> : null}
      {STATUS_LABEL[status]}
    </span>
  );
}
