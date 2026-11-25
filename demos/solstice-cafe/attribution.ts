"use client";

import { useEffect } from "react";
import { captureFirstTouch, readAttribution, safeLocalStorage, type Attribution } from "@/demos/lotus-clinic/attribution";

/**
 * First-touch attribution for the Solstice cafe, through the same helpers as the clinic site but under its own key,
 * so a visitor who saw the clinic demo first does not carry that touch into the cafe. Display only: the owner's
 * enquiry list shows it as a source chip.
 */
export const CAFE_ATTRIBUTION_KEY = "solstice_first_touch";

/** What the enquiry form and Ogi's Confirm send with an enquiry. Null when nothing is stored. */
export function cafeAttribution(): Attribution | null {
  return readAttribution(safeLocalStorage(), Date.now(), CAFE_ATTRIBUTION_KEY);
}

/** Keeps the visitor's first touch (UTM tags, click ids, referrer host). Renders nothing. */
export function CafeAttributionCapture() {
  useEffect(() => {
    captureFirstTouch(safeLocalStorage(), window.location.href, document.referrer, Date.now(), CAFE_ATTRIBUTION_KEY);
  }, []);
  return null;
}
