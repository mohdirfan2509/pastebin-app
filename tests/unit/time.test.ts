import { afterEach, describe, expect, it } from "vitest";
import {
  getNow,
  InvalidTestTimeError,
  isExpired,
  isTestMode,
  parseTestNowMs,
} from "@/lib/time";

describe("time utilities", () => {
  const originalTestMode = process.env.TEST_MODE;

  afterEach(() => {
    process.env.TEST_MODE = originalTestMode;
  });

  it("parses valid non-negative integer timestamps", () => {
    expect(parseTestNowMs("0").getTime()).toBe(0);
    expect(parseTestNowMs("1700000000000").getTime()).toBe(1700000000000);
  });

  it("rejects invalid x-test-now-ms values", () => {
    expect(() => parseTestNowMs("-1")).toThrow(InvalidTestTimeError);
    expect(() => parseTestNowMs("1.5")).toThrow(InvalidTestTimeError);
    expect(() => parseTestNowMs("abc")).toThrow(InvalidTestTimeError);
    expect(() => parseTestNowMs("")).toThrow(InvalidTestTimeError);
  });

  it("uses x-test-now-ms only when TEST_MODE=true", () => {
    process.env.TEST_MODE = "true";
    const headers = new Headers({ "x-test-now-ms": "1000" });
    expect(getNow(headers).getTime()).toBe(1000);
    expect(isTestMode()).toBe(true);
  });

  it("ignores x-test-now-ms when TEST_MODE is disabled", () => {
    process.env.TEST_MODE = "false";
    const before = Date.now();
    const headers = new Headers({ "x-test-now-ms": "1000" });
    const now = getNow(headers).getTime();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
    expect(now).not.toBe(1000);
  });

  it("falls back to real time when header is absent in TEST_MODE", () => {
    process.env.TEST_MODE = "true";
    const before = Date.now();
    const now = getNow(new Headers()).getTime();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });

  it("detects expiration at and after the boundary", () => {
    const expiresAt = new Date("2026-01-01T00:00:00.000Z");
    expect(isExpired(null, new Date())).toBe(false);
    expect(isExpired(expiresAt, new Date("2025-12-31T23:59:59.999Z"))).toBe(
      false
    );
    expect(isExpired(expiresAt, new Date("2026-01-01T00:00:00.000Z"))).toBe(
      true
    );
    expect(isExpired(expiresAt, new Date("2026-01-01T00:00:00.001Z"))).toBe(
      true
    );
  });
});
