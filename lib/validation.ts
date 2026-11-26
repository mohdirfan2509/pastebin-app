import { z } from "zod";

/** Reasonable upper bound (~1 MiB). Enforced on both client and server. */
export const MAX_CONTENT_LENGTH = 1_048_576;

/** TTL upper bound: 1 year in seconds. */
export const MAX_TTL_SECONDS = 365 * 24 * 60 * 60;

/** Max views upper bound. */
export const MAX_VIEWS_LIMIT = 1_000_000;

const positiveInt = z
  .number({
    error: "must be a positive integer",
  })
  .int("must be a positive integer")
  .positive("must be a positive integer");

export const createPasteSchema = z
  .object({
    content: z
      .string({
        error: "content must be a string",
      })
      .max(
        MAX_CONTENT_LENGTH,
        `content must be at most ${MAX_CONTENT_LENGTH} characters`
      )
      .refine((value) => value.trim().length > 0, {
        message: "content must not be empty or whitespace-only",
      }),
    ttl: positiveInt
      .max(MAX_TTL_SECONDS, `ttl must be at most ${MAX_TTL_SECONDS} seconds`)
      .optional(),
    max_views: positiveInt
      .max(MAX_VIEWS_LIMIT, `max_views must be at most ${MAX_VIEWS_LIMIT}`)
      .optional(),
  });

export type CreatePasteInput = z.infer<typeof createPasteSchema>;

export const pasteIdSchema = z
  .string()
  .min(1)
  .max(16)
  .regex(/^[A-Za-z0-9_-]+$/, "invalid paste id");

export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Invalid request";
  const path = first.path.length > 0 ? `${first.path.join(".")}: ` : "";
  return `${path}${first.message}`;
}
