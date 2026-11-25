"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { VenuePhoto } from "./events";

/** A sideways drag longer than this (px) on the big photo moves to the next or previous photo. */
const SWIPE_PX = 50;

/**
 * A venue's photos: one large photo and four smaller ones. Any photo opens a full-screen viewer (a modal <dialog>):
 * arrow buttons, the arrow keys or a swipe move between photos, and Escape or the close button shut it and
 * return focus to the photo that opened it.
 */
export function VenueGallery({ photos, venueName }: { photos: readonly VenuePhoto[]; venueName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const swipeFrom = useRef<number | null>(null);
  const count = photos.length;

  const show = (i: number) => {
    setIndex(i);
    setOpen(true);
    dialog.current?.showModal();
  };
  const step = (delta: number) => setIndex((i) => (i + delta + count) % count);

  // While the viewer is open the page behind it does not scroll.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    swipeFrom.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (swipeFrom.current === null) return;
    const dx = e.clientX - swipeFrom.current;
    swipeFrom.current = null;
    if (Math.abs(dx) >= SWIPE_PX) step(dx < 0 ? 1 : -1);
  };

  const photo = photos[index];

  return (
    <>
      <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-rows-2">
        {photos.slice(0, 5).map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => show(i)}
            aria-label={`Open photo ${i + 1} of ${count}: ${p.alt}`}
            className={`group relative cursor-zoom-in overflow-hidden rounded-xl bg-sol-linen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-sage focus-visible:ring-offset-2 ${
              i === 0 ? "col-span-4 aspect-[16/10] lg:col-span-2 lg:row-span-2 lg:aspect-auto" : "aspect-square lg:aspect-[4/3]"
            }`}
          >
            <Image
              src={p.src}
              alt=""
              fill
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              sizes={i === 0 ? "(min-width: 1280px) 620px, (min-width: 1024px) 50vw, 100vw" : "(min-width: 1280px) 300px, (min-width: 1024px) 25vw, 25vw"}
              className="object-cover object-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
            />
            {i === 0 ? (
              <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg bg-sol-paper/92 px-3 py-1.5 text-xs font-medium text-sol-ink shadow-xs">
                <Expand aria-hidden className="h-3.5 w-3.5" />
                <span>
                  View all <span className="font-sol-mono tabular-nums">{count}</span> photos
                </span>
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <dialog
        ref={dialog}
        aria-label={`${venueName} photos`}
        onClose={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-sol-ink/95 p-0 text-white backdrop:bg-black/70"
      >
        {open ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p className="font-sol-mono text-sm tabular-nums" aria-live="polite">
                {index + 1} / {count}
              </p>
              <button
                type="button"
                autoFocus
                onClick={() => dialog.current?.close()}
                aria-label="Close photos"
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            <div className="relative min-h-0 flex-1 touch-pan-y select-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
              <Image key={photo.src} src={photo.src} alt={photo.alt} fill sizes="100vw" className="object-contain" draggable={false} />
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="absolute top-1/2 left-2 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-4"
              >
                <ChevronLeft aria-hidden className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className="absolute top-1/2 right-2 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4"
              >
                <ChevronRight aria-hidden className="h-6 w-6" />
              </button>
            </div>

            <p className="px-4 py-4 text-center text-sm text-white/85 sm:px-6">{photo.alt}</p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
