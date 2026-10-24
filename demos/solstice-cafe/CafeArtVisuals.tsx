"use client";

import Image from "next/image";
import { useState } from "react";
import { images } from "./data";

/**
 * The Solstice photos, through next/image, each with a drawn fallback if the photo fails to load.
 * Every photo fills its box (`fill` + `sizes`), so the box sets the size and nothing shifts while it loads.
 */

export function HeroSunlitTableScene() {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative flex h-[320px] w-full items-center justify-center overflow-hidden bg-sol-sand select-none sm:h-[360px] lg:h-[385px]">
      {!imgError ? (
        <Image
          src={images.hero}
          alt="Sunlit cafe table in Jubilee Hills with artisan coffee and freshly baked pastries"
          fill
          sizes="(min-width: 480px) 450px, 100vw"
          loading="eager"
          fetchPriority="high"
          onError={() => setImgError(true)}
          className="object-cover object-center transition-transform duration-700 hover:scale-103"
        />
      ) : (
        <svg
          viewBox="0 0 800 640"
          className="h-full w-full object-cover"
          role="img"
          aria-label="Sunlit cafe travertine table in Jubilee Hills with iced pour-over coffee, ceramic latte art cappuccino, and golden flaky Osmania croissant"
        >
          <rect width="800" height="640" fill="#F2ECE1" />
          <ellipse cx="285" cy="425" rx="142" ry="132" fill="#F7F4EE" stroke="#E4DDD1" strokeWidth="3" />
          <ellipse cx="545" cy="392" rx="82" ry="77" fill="#FAF6F0" stroke="#E5DEC9" strokeWidth="3" />
          <ellipse cx="545" cy="392" rx="72" ry="67" fill="#B67643" />
        </svg>
      )}

      {/* Warm scrim at the bottom so the caption reads on any photo */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent" />

      <div className="absolute right-3.5 bottom-3.5 left-3.5 flex items-center justify-between rounded-lg border border-sol-stone-200/80 bg-sol-paper/92 px-3.5 py-2.5 shadow-xs backdrop-blur-md">
        <div>
          <p className="text-[11px] font-medium text-sol-stone-500">Morning Courtyard Table · Road No. 45, Jubilee Hills</p>
          <p className="mt-0.5 text-xs font-semibold text-sol-ink sm:text-sm">Araku Honey-Process Pour Over &amp; Warm Osmania Croissant</p>
        </div>
        <span className="ml-3 shrink-0 font-sol-mono text-[11px] font-medium whitespace-nowrap text-sol-sage tabular-nums">Roasted · 07:30 AM</span>
      </div>
    </div>
  );
}

export function MenuCardPhoto({ imageUrl, alt, variant }: { imageUrl: string; alt: string; variant: string }) {
  const [imgError, setImgError] = useState(false);

  if (!imgError && imageUrl) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-sol-stone-100">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 290px, (min-width: 640px) 50vw, 100vw"
          onError={() => setImgError(true)}
          className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>
    );
  }

  return <MenuCardIllustration variant={variant} />;
}

export function SectionPhoto({ imageUrl, alt, sizes, className = "" }: { imageUrl: string; alt: string; sizes: string; className?: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-sol-linen ${className}`}>
      {!imgError ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={sizes}
          onError={() => setImgError(true)}
          className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-sol-linen text-xs text-sol-stone-500">{alt}</div>
      )}
    </div>
  );
}

export function MenuCardIllustration({ variant }: { variant: string }) {
  switch (variant) {
    case "arabica-pourover":
      return (
        <svg viewBox="0 0 400 300" className="h-full w-full object-cover" aria-hidden="true">
          <rect width="400" height="300" fill="#F4F1EA" />
          <circle cx="290" cy="60" r="110" fill="#FAF8F3" opacity="0.8" />
          <ellipse cx="200" cy="215" rx="68" ry="22" fill="#E3DDD1" />
          <path d="M150,205 L172,115 L228,115 L250,205 Z" fill="#FFFFFF" fillOpacity="0.65" stroke="#D5CEC0" strokeWidth="2" />
          <path d="M156,202 L167,150 L233,150 L244,202 Z" fill="#4A210B" />
          <ellipse cx="200" cy="150" rx="33" ry="8" fill="#6F3618" />
          <polygon points="162,65 238,65 222,115 178,115" fill="#FAF6F0" stroke="#DED6C6" strokeWidth="2" />
          <ellipse cx="200" cy="65" rx="38" ry="8" fill="#EDE6D8" />
        </svg>
      );
    case "spanish-cortado":
      return (
        <svg viewBox="0 0 400 300" className="h-full w-full object-cover" aria-hidden="true">
          <rect width="400" height="300" fill="#F2EDE4" />
          <ellipse cx="200" cy="225" rx="62" ry="18" fill="#DFD7C8" />
          <polygon points="152,105 248,105 234,218 166,218" fill="#FFFDF9" stroke="#D8D0C1" strokeWidth="2" />
          <polygon points="163,192 237,192 233,216 167,216" fill="#F5EFE4" />
          <polygon points="156,126 244,126 237,192 163,192" fill="#8C522B" />
          <polygon points="154,112 246,112 244,126 156,126" fill="#EBDDC8" />
        </svg>
      );
    case "cold-brew-tonic":
      return (
        <svg viewBox="0 0 400 300" className="h-full w-full object-cover" aria-hidden="true">
          <rect width="400" height="300" fill="#EFF3EF" />
          <ellipse cx="200" cy="232" rx="58" ry="16" fill="#D7E0D7" />
          <rect x="155" y="75" width="90" height="152" rx="8" fill="#FFFFFF" stroke="#CBD5CB" strokeWidth="2" />
          <rect x="159" y="135" width="82" height="88" rx="4" fill="#E3ECE4" />
          <rect x="159" y="92" width="82" height="48" rx="4" fill="#3D1E0D" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 400 300" className="h-full w-full object-cover" aria-hidden="true">
          <rect width="400" height="300" fill="#F6F2EB" />
          <ellipse cx="200" cy="162" rx="118" ry="82" fill="#FFFDF9" stroke="#E5DEC9" strokeWidth="2.5" />
        </svg>
      );
  }
}
