import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/pastes/route";
import { GET } from "@/app/api/pastes/[id]/route";
import {
  makeGetRequest,
  makeJsonRequest,
  readJson,
  resetDatabase,
  testPrisma,
} from "../helpers";

type CreateBody = { id: string };
type RetrieveBody = {
  id: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  views: number;
  max_views: number | null;
  remaining_views: number | null;
  error?: string;
};

async function createPaste(body: Record<string, unknown>, headers?: Record<string, string>) {
  const response = await POST(
    makeJsonRequest("http://localhost:3000/api/pastes", { body, headers })
  );
  expect(response.status).toBe(201);
  return readJson<CreateBody>(response);
}

async function getPaste(id: string, headers?: Record<string, string>) {
  return GET(makeGetRequest(`http://localhost:3000/api/pastes/${id}`, headers), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /api/pastes/:id", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("retrieves an existing paste and increments views", async () => {
    const created = await createPaste({ content: "readable" });
    const response = await getPaste(created.id);
    const body = await readJson<RetrieveBody>(response);

    expect(response.status).toBe(200);
    expect(body.content).toBe("readable");
    expect(body.id).toBe(created.id);
    expect(body.views).toBe(1);
    expect(body.max_views).toBeNull();
    expect(body.remaining_views).toBeNull();
    expect(body.expires_at).toBeNull();
    expect(Date.parse(body.created_at)).not.toBeNaN();
  });

  it("returns remaining views when a limit exists", async () => {
    const created = await createPaste({ content: "limited", max_views: 5 });
    const response = await getPaste(created.id);
    const body = await readJson<RetrieveBody>(response);

    expect(body.views).toBe(1);
    expect(body.max_views).toBe(5);
    expect(body.remaining_views).toBe(4);
  });

  it("returns 404 for missing paste", async () => {
    const response = await getPaste("missingPaste1");
    expect(response.status).toBe(404);
  });

  it("returns 404 for invalid paste id format", async () => {
    const response = await getPaste("bad id!");
    expect(response.status).toBe(400);
  });
});

describe("expiration behavior", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("is available before expiration and unavailable at/after expiration", async () => {
    const createdAt = 1_700_000_000_000;
    const created = await createPaste(
      { content: "timed", ttl: 60 },
      { "x-test-now-ms": String(createdAt) }
    );

    const before = await getPaste(created.id, {
      "x-test-now-ms": String(createdAt + 59_999),
    });
    expect(before.status).toBe(200);

    const atExpiry = await getPaste(created.id, {
      "x-test-now-ms": String(createdAt + 60_000),
    });
    expect(atExpiry.status).toBe(404);

    const after = await getPaste(created.id, {
      "x-test-now-ms": String(createdAt + 120_000),
    });
    expect(after.status).toBe(404);
  });

  it("keeps pastes without expiration available", async () => {
    const created = await createPaste({ content: "forever" });
    const response = await getPaste(created.id, {
      "x-test-now-ms": String(Date.now() + 10 * 365 * 24 * 3600 * 1000),
    });
    expect(response.status).toBe(200);
  });

  it("does not consume views for expired pastes", async () => {
    const createdAt = 1_700_000_000_000;
    const created = await createPaste(
      { content: "no-view-after-expiry", ttl: 10, max_views: 5 },
      { "x-test-now-ms": String(createdAt) }
    );

    const expired = await getPaste(created.id, {
      "x-test-now-ms": String(createdAt + 10_000),
    });
    expect(expired.status).toBe(404);

    const stored = await testPrisma.paste.findUnique({ where: { id: created.id } });
    expect(stored?.views).toBe(0);
  });

  it("ignores x-test-now-ms when TEST_MODE is false", async () => {
    const previous = process.env.TEST_MODE;
    process.env.TEST_MODE = "false";

    try {
      const createdAt = Date.now();
      const created = await createPaste(
        { content: "prod-time", ttl: 3600 },
        { "x-test-now-ms": String(createdAt) }
      );

      // Far-future header must be ignored; paste should still be available.
      const response = await getPaste(created.id, {
        "x-test-now-ms": String(createdAt + 10_000_000_000),
      });
      expect(response.status).toBe(200);
    } finally {
      process.env.TEST_MODE = previous;
    }
  });
});

describe("view limit behavior", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("allows exactly one retrieval when max_views = 1", async () => {
    const created = await createPaste({ content: "once", max_views: 1 });

    const first = await getPaste(created.id);
    expect(first.status).toBe(200);

    const second = await getPaste(created.id);
    expect(second.status).toBe(404);
  });

  it("allows exactly five retrievals when max_views = 5", async () => {
    const created = await createPaste({ content: "five", max_views: 5 });

    for (let i = 0; i < 5; i++) {
      const response = await getPaste(created.id);
      expect(response.status).toBe(200);
      const body = await readJson<RetrieveBody>(response);
      expect(body.views).toBe(i + 1);
      expect(body.remaining_views).toBe(5 - (i + 1));
    }

    const exhausted = await getPaste(created.id);
    expect(exhausted.status).toBe(404);
  });

  it("does not increment views on failed retrievals", async () => {
    const created = await createPaste({ content: "check", max_views: 1 });
    await getPaste(created.id);

    const failed = await getPaste(created.id);
    expect(failed.status).toBe(404);

    const stored = await testPrisma.paste.findUnique({ where: { id: created.id } });
    expect(stored?.views).toBe(1);
  });

  it("keeps unlimited pastes available across many views", async () => {
    const created = await createPaste({ content: "unlimited" });
    for (let i = 0; i < 8; i++) {
      const response = await getPaste(created.id);
      expect(response.status).toBe(200);
    }
  });

  it("enforces whichever of TTL or max_views occurs first", async () => {
    const createdAt = 1_700_000_000_000;
    const created = await createPaste(
      { content: "both-limits", ttl: 100, max_views: 2 },
      { "x-test-now-ms": String(createdAt) }
    );

    expect((await getPaste(created.id, { "x-test-now-ms": String(createdAt + 1) })).status).toBe(200);
    expect((await getPaste(created.id, { "x-test-now-ms": String(createdAt + 2) })).status).toBe(200);
    expect((await getPaste(created.id, { "x-test-now-ms": String(createdAt + 3) })).status).toBe(404);

    const stillWithinTtl = await getPaste(created.id, {
      "x-test-now-ms": String(createdAt + 50_000),
    });
    expect(stillWithinTtl.status).toBe(404);
  });
});
