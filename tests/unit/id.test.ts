import { describe, expect, it } from "vitest";
import { generatePasteId } from "@/lib/id";

describe("generatePasteId", () => {
  it("generates URL-safe ids of expected length", () => {
    const id = generatePasteId();
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique ids across many samples", () => {
    const ids = new Set(Array.from({ length: 200 }, () => generatePasteId()));
    expect(ids.size).toBe(200);
  });
});
