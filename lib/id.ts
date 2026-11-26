import { randomBytes } from "crypto";

/** URL-safe alphabet (no ambiguous padding). */
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const ID_LENGTH = 12;
const MAX_ATTEMPTS = 8;

/**
 * Generate a cryptographically secure, URL-safe paste ID (12 chars).
 * Not derived from sequential database IDs.
 */
export function generatePasteId(): string {
  const bytes = randomBytes(ID_LENGTH);
  let id = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return id;
}

export function getIdMaxAttempts(): number {
  return MAX_ATTEMPTS;
}
