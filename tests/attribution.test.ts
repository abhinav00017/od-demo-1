import { describe, expect, it } from "vitest";
import { ATTRIBUTION_KEY, ATTRIBUTION_TTL_MS, attributionFrom, captureFirstTouch, readAttribution, sourceFrom } from "@/demos/lotus-clinic/attribution";
import { parseAttribution } from "@/lib/bookings/attribution";

const SITE = "https://od-demo-lyart.vercel.app/clinic/website";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("sourceFrom", () => {
  it("Google Ads: gclid, or utm_source google with a paid medium", () => {
    expect(sourceFrom({ gclid: "abc" }, "")).toBe("google_ads");
    for (const medium of ["cpc", "PPC", "paid"]) expect(sourceFrom({ utm_source: "Google", utm_medium: medium }, "")).toBe("google_ads");
    // gclid wins over a Google search referrer.
    expect(sourceFrom({ gclid: "abc" }, "https://www.google.com/")).toBe("google_ads");
  });

  it("Meta Ads: fbclid, or facebook/instagram/meta with a paid medium", () => {
    expect(sourceFrom({ fbclid: "x" }, "")).toBe("meta_ads");
    for (const src of ["facebook", "instagram", "meta", "fb", "ig"]) expect(sourceFrom({ utm_source: src, utm_medium: "paid_social" }, "")).toBe("meta_ads");
    expect(sourceFrom({ utm_source: "facebook", utm_medium: "cpc" }, "")).toBe("meta_ads");
  });

  it("an unpaid utm_source is not an ad", () => {
    expect(sourceFrom({ utm_source: "google", utm_medium: "organic" }, "")).toBe("website");
    expect(sourceFrom({ utm_source: "facebook", utm_medium: "social" }, "")).toBe("website");
  });

  it("Google Maps: maps.google.* or a google.* /maps referrer", () => {
    expect(sourceFrom({}, "https://maps.google.com/")).toBe("google_maps");
    expect(sourceFrom({}, "https://maps.google.co.in/maps?q=lotus")).toBe("google_maps");
    expect(sourceFrom({}, "https://www.google.com/maps/place/Lotus")).toBe("google_maps");
    expect(sourceFrom({ referrer: "maps.google.com" }, "")).toBe("google_maps");
  });

  it("Google Search: any other google.* referrer, including country domains", () => {
    expect(sourceFrom({}, "https://www.google.com/")).toBe("google_search");
    expect(sourceFrom({}, "https://www.google.co.in/search?q=gynecologist+vizag")).toBe("google_search");
    expect(sourceFrom({}, "https://google.de/")).toBe("google_search");
    // Not Google: look-alike hosts.
    expect(sourceFrom({}, "https://notgoogle.com/")).toBe("website");
    expect(sourceFrom({}, "https://google.com.evil.example/")).toBe("website");
  });

  it("WhatsApp: utm_source whatsapp or a WhatsApp referrer", () => {
    expect(sourceFrom({ utm_source: "WhatsApp" }, "")).toBe("whatsapp");
    expect(sourceFrom({}, "https://wa.me/")).toBe("whatsapp");
    expect(sourceFrom({}, "https://web.whatsapp.com/")).toBe("whatsapp");
  });

  it("everything else is the website", () => {
    expect(sourceFrom({}, "")).toBe("website");
    expect(sourceFrom({}, "https://www.bing.com/")).toBe("website");
    expect(sourceFrom({}, "not a url")).toBe("website");
  });
});

describe("attributionFrom", () => {
  it("reads utm params and click ids, keeps the referrer host only, and the landing path without the query", () => {
    const a = attributionFrom(`${SITE}/services?utm_source=google&utm_medium=cpc&utm_campaign=pcos-awareness&gclid=Cj0&utm_term=pcos`, "https://www.google.com/search?q=private");
    expect(a).toEqual({
      source: "google_ads",
      campaign: "pcos-awareness",
      utm: { utm_source: "google", utm_medium: "cpc", utm_campaign: "pcos-awareness", utm_term: "pcos", gclid: "Cj0", referrer: "www.google.com", landing: "/clinic/website/services" },
    });
    expect(JSON.stringify(a)).not.toContain("private");
  });

  it("ignores our own site as a referrer", () => {
    expect(attributionFrom(`${SITE}/book`, `${SITE}/`)).toEqual({ source: "website", campaign: null, utm: { landing: "/clinic/website/book" } });
  });

  it("caps long values", () => {
    const a = attributionFrom(`${SITE}?utm_campaign=${"x".repeat(500)}`, "");
    expect(a.campaign).toHaveLength(200);
  });
});

describe("first touch in localStorage", () => {
  it("stores the first visit and keeps it on later visits for 30 days", () => {
    const storage = memoryStorage();
    const now = Date.parse("2026-11-10T05:00:00Z");
    expect(captureFirstTouch(storage, `${SITE}?fbclid=abc&utm_campaign=fertility-consult`, "", now)?.source).toBe("meta_ads");
    // A later visit from Google search does not overwrite it.
    expect(captureFirstTouch(storage, SITE, "https://www.google.com/", now + 1000)?.source).toBe("meta_ads");
    expect(readAttribution(storage, now + ATTRIBUTION_TTL_MS - 1)).toMatchObject({ source: "meta_ads", campaign: "fertility-consult" });
    // After 30 days it expires and the next visit becomes the first touch.
    expect(readAttribution(storage, now + ATTRIBUTION_TTL_MS + 1)).toBeNull();
    expect(storage.map.has(ATTRIBUTION_KEY)).toBe(false);
    expect(captureFirstTouch(storage, SITE, "https://www.google.com/", now + ATTRIBUTION_TTL_MS + 2)?.source).toBe("google_search");
  });

  it("never throws when storage is missing, blocked or holds junk", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => undefined,
    };
    expect(captureFirstTouch(throwing, SITE, "")).toBeNull();
    expect(readAttribution(undefined)).toBeNull();
    expect(readAttribution(memoryStorage({ [ATTRIBUTION_KEY]: "{not json" }))).toBeNull();
    expect(readAttribution(memoryStorage({ [ATTRIBUTION_KEY]: JSON.stringify({ source: "website" }) }))).toBeNull();
  });
});

describe("parseAttribution (server)", () => {
  it("keeps a valid public source, trims and caps strings, drops unknown keys", () => {
    expect(parseAttribution({ source: "meta_ads", campaign: "  spring ", utm: { utm_source: "instagram", fbclid: "x".repeat(300), other: "y" } })).toEqual({
      source: "meta_ads",
      campaign: "spring",
      utm: { utm_source: "instagram", fbclid: "x".repeat(200) },
    });
  });

  it("anything else falls back to website with nothing kept", () => {
    expect(parseAttribution({})).toEqual({ source: "website", campaign: null, utm: null });
    expect(parseAttribution({ source: "referral" }).source).toBe("website");
    expect(parseAttribution({ source: "walk_in" }).source).toBe("website");
    expect(parseAttribution({ source: { $ne: 1 }, campaign: 7, utm: [1, 2] })).toEqual({ source: "website", campaign: null, utm: null });
    expect(parseAttribution(null)).toEqual({ source: "website", campaign: null, utm: null });
    expect(parseAttribution({ source: "google_ads", utm: { gclid: 5, landing: "/x" } }).utm).toEqual({ landing: "/x" });
  });
});
