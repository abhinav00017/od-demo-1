/**
 * QR codes as one SVG path. Server-side only, so the encoder never reaches the browser bundle.
 * Uses qrcode-generator (no dependencies).
 */
import qrcode from "qrcode-generator";

/** A QR code ready for <svg viewBox="0 0 size size"><path d={d} /></svg>. Includes a 4-module quiet zone. */
export type QrPath = { size: number; d: string };

const QUIET = 4;

/** Encodes text at error level M. Each run of dark modules in a row is one rectangle in the path. */
export function qrPath(text: string): QrPath {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.isDark(r, c)) {
        c++;
        continue;
      }
      const start = c;
      while (c < n && qr.isDark(r, c)) c++;
      d += `M${start + QUIET} ${r + QUIET}h${c - start}v1h-${c - start}z`;
    }
  }
  return { size: n + QUIET * 2, d };
}
