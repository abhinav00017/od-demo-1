import { Coffee, Stethoscope } from "lucide-react";
import type { Industry } from "@/lib/schema";

export function IndustryIcon({ icon, className = "size-7" }: { icon: Industry["icon"]; className?: string }) {
  const Cmp = icon === "clinic" ? Stethoscope : Coffee;
  return <Cmp aria-hidden className={className} strokeWidth={1.75} />;
}
