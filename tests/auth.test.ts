// @vitest-environment node
import { describe, expect, it } from "vitest";
import { adminConfig, checkPassword, SESSION_TTL_MS, signSession, verifySession } from "@/lib/admin/auth";

describe("admin cookie", () => {
  const now = Date.UTC(2026, 9, 20, 10);

  it("verifies a cookie it signed", () => {
    expect(verifySession(signSession("s3cret", now), "s3cret", now + 1000)).toBe(true);
  });

  it("refuses a wrong secret, a tampered expiry and garbage", () => {
    const token = signSession("s3cret", now);
    expect(verifySession(token, "other", now)).toBe(false);
    const [, exp, sig] = token.split(".");
    expect(verifySession(`admin.${Number(exp) + 1}.${sig}`, "s3cret", now)).toBe(false);
    expect(verifySession("admin", "s3cret", now)).toBe(false);
    expect(verifySession("", "s3cret", now)).toBe(false);
    expect(verifySession(undefined, "s3cret", now)).toBe(false);
  });

  it("refuses an expired cookie", () => {
    expect(verifySession(signSession("s3cret", now), "s3cret", now + SESSION_TTL_MS + 1)).toBe(false);
  });

  it("checks the password", () => {
    expect(checkPassword("hunter2", "hunter2")).toBe(true);
    expect(checkPassword("hunter3", "hunter2")).toBe(false);
    expect(checkPassword("", "hunter2")).toBe(false);
    expect(checkPassword(undefined, "hunter2")).toBe(false);
  });
});

describe("admin config", () => {
  it("uses ADMIN_PASSWORD, and ADMIN_SECRET when set", () => {
    expect(adminConfig({ ADMIN_PASSWORD: "pw", NODE_ENV: "production" })).toEqual({ configured: true, password: "pw", secret: "pw", devFallback: false });
    expect(adminConfig({ ADMIN_PASSWORD: "pw", ADMIN_SECRET: "sig", NODE_ENV: "production" })).toMatchObject({ secret: "sig" });
  });

  it("accepts demo in development only", () => {
    expect(adminConfig({ NODE_ENV: "development" })).toMatchObject({ configured: true, password: "demo", devFallback: true });
    expect(adminConfig({ NODE_ENV: "production" })).toEqual({ configured: false });
    expect(adminConfig({ NODE_ENV: "test" })).toEqual({ configured: false });
  });
});
