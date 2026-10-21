import { Activity, Baby, HeartPulse, Stethoscope, Sun, Video, type LucideIcon } from "lucide-react";
import type { ServiceIconName } from "./data";

const ICONS: Record<ServiceIconName, LucideIcon> = {
  baby: Baby,
  stethoscope: Stethoscope,
  "heart-pulse": HeartPulse,
  activity: Activity,
  sun: Sun,
  video: Video,
};

/** A thin teal line icon in a soft teal circle. Decorative: the service name sits beside it. */
export function ServiceIcon({ name }: { name: ServiceIconName }) {
  const Icon = ICONS[name];
  return (
    <span aria-hidden data-service-icon={name} className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lotus-avatar text-lotus-accent">
      <Icon strokeWidth={1.5} className="size-6" />
    </span>
  );
}
