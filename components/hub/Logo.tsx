import Image from "next/image";
import Link from "next/link";

// Wordmark cropped from public/brand/logo-source.png with a transparent background (1256x440).
const WIDTH = 1256;
const HEIGHT = 440;

export function Logo({ size = "sm", eager = false }: { size?: "sm" | "lg"; eager?: boolean }) {
  const cls = size === "lg" ? "h-14 w-auto sm:h-20" : "h-8 w-auto sm:h-9";
  return (
    <Link href="/" aria-label="onlydevs demos home" className="inline-flex shrink-0 rounded-md">
      <Image
        src="/brand/onlydevs-wordmark.png"
        alt="onlydevs"
        width={WIDTH}
        height={HEIGHT}
        className={cls}
        loading={eager ? "eager" : undefined}
        sizes={size === "lg" ? "240px" : "110px"}
      />
    </Link>
  );
}
