"use client";

import { useEffect } from "react";
import { captureFirstTouch, safeLocalStorage } from "./attribution";

/** Keeps the visitor's first touch (UTM tags, click ids, referrer host) for the booking form. Renders nothing. */
export function AttributionCapture() {
  useEffect(() => {
    captureFirstTouch(safeLocalStorage(), window.location.href, document.referrer);
  }, []);
  return null;
}
