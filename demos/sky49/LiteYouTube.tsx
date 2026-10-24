"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A click-to-load YouTube player. Until the visitor taps play, the page loads only a local poster:
 * no YouTube script, frame or thumbnail request.
 */
export function LiteYouTube({ videoId, title, poster }: { videoId: string; title: string; poster: { src: string; alt: string } }) {
  const [play, setPlay] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-sky-stone/40 bg-sky-charcoal shadow-lg">
      {play ? (
        <iframe
          title={title}
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className="group relative block h-full w-full cursor-pointer" onClick={() => setPlay(true)}>
          <Image
            src={poster.src}
            alt={poster.alt}
            fill
            sizes="(min-width: 896px) 832px, 100vw"
            className="object-cover opacity-90 transition group-hover:opacity-100"
          />
          <span className="sr-only">Play video: {title}</span>
          <span
            className="absolute inset-0 flex items-center justify-center bg-sky-charcoal/10 transition group-hover:bg-sky-charcoal/20"
            aria-hidden="true"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-xl ring-2 ring-sky-gold/40">
              <svg width="28" height="28" viewBox="0 0 24 24" className="ml-1 text-sky-charcoal" aria-hidden="true">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
