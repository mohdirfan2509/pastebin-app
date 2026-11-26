import { describe, expect, it } from "vitest";
import { createPasteSchema } from "@/lib/validation";

describe("createPasteSchema", () => {
  it("accepts content only", () => {
    const result = createPasteSchema.parse({ content: "Hello, world!" });
    expect(result.content).toBe("Hello, world!");
    expect(result.ttl).toBeUndefined();
    expect(result.max_views).toBeUndefined();
  });

  it("accepts ttl and max_views", () => {
    const result = createPasteSchema.parse({
      content: "Hello",
      ttl: 3600,
      max_views: 5,
    });
    expect(result.ttl).toBe(3600);
    expect(result.max_views).toBe(5);
  });

  it("rejects empty and whitespace-only content", () => {
    expect(createPasteSchema.safeParse({ content: "" }).success).toBe(false);
    expect(createPasteSchema.safeParse({ content: "   " }).success).toBe(
      false
    );
  });

  it("rejects invalid ttl and max_views", () => {
    expect(
      createPasteSchema.safeParse({ content: "x", ttl: 0 }).success
    ).toBe(false);
    expect(
      createPasteSchema.safeParse({ content: "x", ttl: -1 }).success
    ).toBe(false);
    expect(
      createPasteSchema.safeParse({ content: "x", ttl: 1.5 }).success
    ).toBe(false);
    expect(
      createPasteSchema.safeParse({ content: "x", ttl: "3600" }).success
    ).toBe(false);
    expect(
      createPasteSchema.safeParse({ content: "x", max_views: 0 }).success
    ).toBe(false);
    expect(
      createPasteSchema.safeParse({ content: "x", max_views: -5 }).success
    ).toBe(false);
    expect(
      createPasteSchema.safeParse({ content: "x", max_views: 2.2 }).success
    ).toBe(false);
  });
});
