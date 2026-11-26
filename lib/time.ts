/**
 * Centralized time source for expiration checks and paste creation.
 * When TEST_MODE=true, the x-test-now-ms header may override "now".
 * Outside TEST_MODE the header is always ignored.
 */

export class InvalidTestTimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTestTimeError";
  }
}

export function isTestMode(): boolean {
  return process.env.TEST_MODE === "true";
}

/**
 * Resolve the current time used for expiration evaluation and creation.
 * Pass request headers when available so TEST_MODE can apply x-test-now-ms.
 */
export function getNow(headers?: Headers | null): Date {
  if (isTestMode() && headers) {
    const raw = headers.get("x-test-now-ms");
    if (raw !== null && raw !== undefined && raw !== "") {
      return parseTestNowMs(raw);
    }
  }
  return new Date();
}

export function parseTestNowMs(raw: string): Date {
  if (!/^\d+$/.test(raw)) {
    throw new InvalidTestTimeError(
      "x-test-now-ms must be a non-negative integer timestamp in milliseconds"
    );
  }

  const ms = Number(raw);

  if (!Number.isSafeInteger(ms) || ms < 0) {
    throw new InvalidTestTimeError(
      "x-test-now-ms must be a non-negative integer timestamp in milliseconds"
    );
  }

  return new Date(ms);
}

export function isExpired(expiresAt: Date | null | undefined, now: Date): boolean {
  if (!expiresAt) return false;
  return now.getTime() >= expiresAt.getTime();
}
