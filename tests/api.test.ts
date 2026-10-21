// @vitest-environment node
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/admin/login/route";
import { GET as session } from "@/app/api/admin/session/route";
import { PATCH } from "@/app/api/bookings/[id]/route";
import { GET, POST } from "@/app/api/bookings/route";
import { ADMIN_COOKIE, signSession } from "@/lib/admin/auth";
import { memoryStore, resetMemoryStore } from "@/lib/bookings/memory";
import { resetRateLimits } from "@/lib/rateLimit";

// Tuesday 20 Oct 2026, 10:00 in India. Sunday is 25 Oct.
const NOW = new Date("2026-10-20T04:30:00Z");

const good = {
  name: "Priya Sharma",
  phone: "+91 98765 43210",
  visitType: "clinic",
  date: "2026-10-22",
  slot: "Morning, 10 am – 1 pm",
  reason: "Pregnancy care",
  consent: true,
};

function req(url: string, init: { method?: string; body?: unknown; cookie?: string; ip?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": init.ip ?? "203.0.113.7" };
  if (init.cookie) headers.cookie = init.cookie;
  return new NextRequest(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
}

const adminCookie = () => `${ADMIN_COOKIE}=${signSession("test-secret")}`;
const all = () => memoryStore.list({ from: "2000-01-01" });
const logs: string[] = [];

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  resetMemoryStore();
  resetRateLimits();
  logs.length = 0;
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("ADMIN_PASSWORD", "open-sesame");
  vi.stubEnv("ADMIN_SECRET", "test-secret");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("CLINIC_NOTIFY_EMAIL", "");
  for (const level of ["log", "error", "warn", "info"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/bookings", () => {
  it("saves a valid booking with the phone normalised", async () => {
    const res = await POST(req("/api/bookings", { method: "POST", body: good }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.id).toBe(data.booking.id);
    expect(data.booking).toMatchObject({ clinicSlug: "lotus-clinic", name: "Priya Sharma", phone: "9876543210", status: "new", date: "2026-10-22" });
    expect(await all()).toHaveLength(1);
  });

  it("answers 400 with field errors for bad input, and saves nothing", async () => {
    const res = await POST(req("/api/bookings", { method: "POST", body: { ...good, name: "", phone: "12345", date: "2026-10-19", consent: false } }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(Object.keys(data.fieldErrors).sort()).toEqual(["consent", "date", "name", "phone"]);
    expect(await all()).toHaveLength(0);
  });

  it("refuses an unknown visit type", async () => {
    const res = await POST(req("/api/bookings", { method: "POST", body: { ...good, visitType: "home-visit" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.visitType).toMatch(/clinic visit or an online consultation/);
  });

  it("refuses a Sunday clinic visit, as the form does", async () => {
    const res = await POST(req("/api/bookings", { method: "POST", body: { ...good, date: "2026-10-25" } }));
    expect((await res.json()).fieldErrors.date).toMatch(/closed on Sundays/);
  });

  it("answers ok to a filled honeypot but saves nothing", async () => {
    const res = await POST(req("/api/bookings", { method: "POST", body: { ...good, lotus_hp: "http://spam.example" } }));
    expect(res.status).toBe(201);
    expect((await res.json()).ok).toBe(true);
    expect(await all()).toHaveLength(0);
  });

  it("answers 400 to a body that is not JSON", async () => {
    const res = await POST(req("/api/bookings", { method: "POST", body: "name=Priya" }));
    expect(res.status).toBe(400);
  });

  it("limits one IP to 10 requests a minute", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await POST(req("/api/bookings", { method: "POST", body: { ...good, name: "" }, ip: "198.51.100.9" }))).status);
    expect(codes.slice(0, 10).every((c) => c === 400)).toBe(true);
    expect(codes[10]).toBe(429);
    expect((await POST(req("/api/bookings", { method: "POST", body: good, ip: "198.51.100.10" }))).status).toBe(201);
  });

  it("skips the email when Resend is not set, and never logs the phone number", async () => {
    await POST(req("/api/bookings", { method: "POST", body: good }));
    await vi.waitFor(() => expect(logs).toContain("notify skipped: not configured"));
    expect(logs.join("\n")).not.toMatch(/98765|43210|9876543210/);
  });
});

describe("GET /api/bookings", () => {
  it("needs the admin cookie", async () => {
    expect((await GET(req("/api/bookings"))).status).toBe(401);
    expect((await GET(req("/api/bookings", { cookie: `${ADMIN_COOKIE}=forged.123.abc` }))).status).toBe(401);
  });

  it("returns bookings from today onward", async () => {
    await memoryStore.create({ clinicSlug: "lotus-clinic", name: "Old", phone: "9876543210", visitType: "clinic", date: "2026-10-19", slot: "x", reason: "y" });
    await POST(req("/api/bookings", { method: "POST", body: good }));
    const res = await GET(req("/api/bookings", { cookie: adminCookie() }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const data = await res.json();
    expect(data.today).toBe("2026-10-20");
    expect(data.storage).toBe("memory");
    expect(data.bookings.map((b: { name: string }) => b.name)).toEqual(["Priya Sharma"]);
  });
});

describe("PATCH /api/bookings/[id]", () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  it("confirms a booking", async () => {
    const { id } = await (await POST(req("/api/bookings", { method: "POST", body: good }))).json();
    const res = await PATCH(req(`/api/bookings/${id}`, { method: "PATCH", body: { status: "confirmed" }, cookie: adminCookie() }), ctx(id));
    expect(res.status).toBe(200);
    expect((await res.json()).booking.status).toBe("confirmed");
  });

  it("needs the cookie, a known status and a known id", async () => {
    const { id } = await (await POST(req("/api/bookings", { method: "POST", body: good }))).json();
    expect((await PATCH(req(`/api/bookings/${id}`, { method: "PATCH", body: { status: "confirmed" } }), ctx(id))).status).toBe(401);
    expect((await PATCH(req(`/api/bookings/${id}`, { method: "PATCH", body: { status: "done" }, cookie: adminCookie() }), ctx(id))).status).toBe(400);
    expect((await PATCH(req("/api/bookings/nope", { method: "PATCH", body: { status: "cancelled" }, cookie: adminCookie() }), ctx("nope"))).status).toBe(404);
    const unknown = "00000000-0000-4000-8000-000000000000";
    expect((await PATCH(req(`/api/bookings/${unknown}`, { method: "PATCH", body: { status: "cancelled" }, cookie: adminCookie() }), ctx(unknown))).status).toBe(404);
  });
});

describe("admin login", () => {
  it("refuses a wrong password", async () => {
    const res = await login(req("/api/admin/login", { method: "POST", body: { password: "nope" } }));
    expect(res.status).toBe(401);
    expect(res.cookies.get(ADMIN_COOKIE)).toBeUndefined();
  });

  it("sets an httpOnly, sameSite=lax cookie that opens the bookings", async () => {
    const res = await login(req("/api/admin/login", { method: "POST", body: { password: "open-sesame" } }));
    expect(res.status).toBe(200);
    const header = res.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=lax/i);
    const value = res.cookies.get(ADMIN_COOKIE)?.value;
    expect((await GET(req("/api/bookings", { cookie: `${ADMIN_COOKIE}=${value}` }))).status).toBe(200);
  });

  it("is off in production without ADMIN_PASSWORD", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await login(req("/api/admin/login", { method: "POST", body: { password: "demo" } }))).status).toBe(503);
    expect(await (await session(req("/api/admin/session"))).json()).toMatchObject({ configured: false, authed: false });
  });

  it("accepts demo in development without ADMIN_PASSWORD, and says so", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("ADMIN_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(await (await session(req("/api/admin/session"))).json()).toMatchObject({ configured: true, devPassword: true });
    expect((await login(req("/api/admin/login", { method: "POST", body: { password: "demo" } }))).status).toBe(200);
  });
});
