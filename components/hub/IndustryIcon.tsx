import { Building2, Coffee, LayoutGrid, Stethoscope, Ticket } from "lucide-react";
import type { Industry } from "@/lib/schema";

export function IndustryIcon({ icon, className = "size-7" }: { icon: Industry["icon"]; className?: string }) {
  const Cmp = icon === "clinic" ? Stethoscope : icon === "cafe" ? Coffee : icon === "ticketing" ? Ticket : icon === "tiles" ? LayoutGrid : Building2;
  return <Cmp aria-hidden className={className} strokeWidth={1.75} />;
}
