import { Prisma } from "@prisma/client";
import { buildPasteUrl } from "@/lib/app-url";
import { generatePasteId, getIdMaxAttempts } from "@/lib/id";
import { prisma } from "@/lib/prisma";
import { isExpired } from "@/lib/time";
import type { CreatePasteInput } from "@/lib/validation";

export class PasteNotFoundError extends Error {
  constructor(message = "Paste not found or no longer available") {
    super(message);
    this.name = "PasteNotFoundError";
  }
}

export class PasteConflictError extends Error {
  constructor(message = "Unable to allocate a unique paste id") {
    super(message);
    this.name = "PasteConflictError";
  }
}

export type CreatePasteResult = {
  id: string;
  url: string;
  expires_at: string | null;
  max_views: number | null;
};

export type RetrievePasteResult = {
  id: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  views: number;
  max_views: number | null;
  remaining_views: number | null;
};

type PasteRow = {
  id: string;
  content: string;
  created_at: Date;
  expires_at: Date | null;
  max_views: number | null;
  views: number;
};

export async function createPaste(
  input: CreatePasteInput,
  now: Date
): Promise<CreatePasteResult> {
  const expiresAt =
    input.ttl !== undefined
      ? new Date(now.getTime() + input.ttl * 1000)
      : null;
  const maxViews = input.max_views ?? null;

  let lastError: unknown;

  for (let attempt = 0; attempt < getIdMaxAttempts(); attempt++) {
    const id = generatePasteId();

    try {
      const paste = await prisma.paste.create({
        data: {
          id,
          content: input.content,
          createdAt: now,
          expiresAt,
          maxViews,
          views: 0,
        },
      });

      return {
        id: paste.id,
        url: buildPasteUrl(paste.id),
        expires_at: paste.expiresAt ? paste.expiresAt.toISOString() : null,
        max_views: paste.maxViews,
      };
    } catch (error) {
      lastError = error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new PasteConflictError();
}

/**
 * Atomically retrieve a paste and consume one view.
 *
 * Uses a single conditional UPDATE ... RETURNING so concurrent requests
 * cannot both consume the same remaining view slot.
 *
 * Conditions enforced in SQL:
 * - row exists
 * - not expired (expires_at IS NULL OR expires_at > now)
 * - view limit not exhausted (max_views IS NULL OR views < max_views)
 */
export async function retrievePaste(
  id: string,
  now: Date
): Promise<RetrievePasteResult> {
  const rows = await prisma.$queryRaw<PasteRow[]>`
    UPDATE pastes
    SET views = views + 1
    WHERE id = ${id}
      AND (expires_at IS NULL OR expires_at > ${now})
      AND (max_views IS NULL OR views < max_views)
    RETURNING
      id,
      content,
      created_at,
      expires_at,
      max_views,
      views
  `;

  const row = rows[0];

  if (!row) {
    // Distinguish missing vs expired/exhausted only for internal clarity;
    // API always returns the same 404 message.
    await assertUnavailableReason(id, now);
    throw new PasteNotFoundError();
  }

  return mapRetrieveResult(row);
}

async function assertUnavailableReason(id: string, now: Date): Promise<void> {
  const existing = await prisma.paste.findUnique({ where: { id } });

  if (!existing) {
    throw new PasteNotFoundError();
  }

  if (isExpired(existing.expiresAt, now)) {
    throw new PasteNotFoundError();
  }

  if (existing.maxViews !== null && existing.views >= existing.maxViews) {
    throw new PasteNotFoundError();
  }

  // Race: another request may have consumed the last view between UPDATE and lookup.
  throw new PasteNotFoundError();
}

function mapRetrieveResult(row: PasteRow): RetrievePasteResult {
  const maxViews = row.max_views;
  const views = row.views;
  const remainingViews =
    maxViews === null ? null : Math.max(maxViews - views, 0);

  return {
    id: row.id,
    content: row.content,
    created_at: new Date(row.created_at).toISOString(),
    expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    views,
    max_views: maxViews,
    remaining_views: remainingViews,
  };
}

/**
 * Optional housekeeping: remove pastes that are already expired.
 * Not required for correctness — retrieval already filters by expiration.
 */
export async function cleanupExpiredPastes(now: Date): Promise<number> {
  const result = await prisma.paste.deleteMany({
    where: {
      expiresAt: { lte: now },
    },
  });
  return result.count;
}
