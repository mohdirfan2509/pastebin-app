import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/pastes/route";
import {
  makeJsonRequest,
  readJson,
  resetDatabase,
  testPrisma,
} from "../helpers";

type CreateBody = {
  id: string;
  url: string;
  expires_at: string | null;
  max_views: number | null;
  error?: string;
};

describe("POST /api/pastes", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("creates a paste with content only", async () => {
    const response = await POST(
      makeJsonRequest("http://localhost:3000/api/pastes", {
        body: { content: "Hello, world!" },
      })
    );
    const body = await readJson<CreateBody>(response);

    expect(response.status).toBe(201);
    expect(body.id).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(body.url).toBe(`http://localhost:3000/p/${body.id}`);
    expect(body.expires_at).toBeNull();
    expect(body.max_views).toBeNull();

    const stored = await testPrisma.paste.findUnique({ where: { id: body.id } });
    expect(stored?.content).toBe("Hello, world!");
    expect(stored?.views).toBe(0);
  });

  it("creates a paste with TTL", async () => {
    const nowMs = 1_700_000_000_000;
    const response = await POST(
      makeJsonRequest("http://localhost:3000/api/pastes", {
        body: { content: "expires", ttl: 3600 },
        headers: { "x-test-now-ms": String(nowMs) },
      })
    );
    const body = await readJson<CreateBody>(response);

    expect(response.status).toBe(201);
    expect(body.expires_at).toBe(new Date(nowMs + 3600_000).toISOString());
  });

  it("creates a paste with max views", async () => {
    const response = await POST(
      makeJsonRequest("http://localhost:3000/api/pastes", {
        body: { content: "limited", max_views: 5 },
      })
    );
    const body = await readJson<CreateBody>(response);

    expect(response.status).toBe(201);
    expect(body.max_views).toBe(5);
  });

  it("creates a paste with TTL and max views", async () => {
    const response = await POST(
      makeJsonRequest("http://localhost:3000/api/pastes", {
        body: { content: "both", ttl: 60, max_views: 10 },
      })
    );
    const body = await readJson<CreateBody>(response);

    expect(response.status).toBe(201);
    expect(body.max_views).toBe(10);
    expect(body.expires_at).not.toBeNull();
  });

  it("rejects empty content", async () => {
    const response = await POST(
      makeJsonRequest("http://localhost:3000/api/pastes", {
        body: { content: "" },
      })
    );
    expect(response.status).toBe(400);
  });

  it("rejects whitespace-only content", async () => {
    const response = await POST(
      makeJsonRequest("http://localhost:3000/api/pastes", {
        body: { content: "   \n\t  " },
      })
    );
    expect(response.status).toBe(400);
  });

  it("rejects invalid TTL values", async () => {
    for (const ttl of [0, -1, 1.5, "3600", null]) {
      const response = await POST(
        makeJsonRequest("http://localhost:3000/api/pastes", {
          body: { content: "x", ttl },
        })
      );
      expect(response.status).toBe(400);
    }
  });

  it("rejects invalid max_views values", async () => {
    for (const max_views of [0, -5, 2.2, "5", null]) {
      const response = await POST(
        makeJsonRequest("http://localhost:3000/api/pastes", {
          body: { content: "x", max_views },
        })
      );
      expect(response.status).toBe(400);
    }
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("http://localhost:3000/api/pastes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    const response = await POST(request as never);
    expect(response.status).toBe(400);
    const body = await readJson<{ error: string }>(response);
    expect(body.error).toMatch(/json/i);
  });

  it("generates unique paste ids", async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const response = await POST(
        makeJsonRequest("http://localhost:3000/api/pastes", {
          body: { content: `paste-${i}` },
        })
      );
      const body = await readJson<CreateBody>(response);
      expect(response.status).toBe(201);
      ids.add(body.id);
    }
    expect(ids.size).toBe(20);
  });

  it("persists pastes in the database", async () => {
    const response = await POST(
      makeJsonRequest("http://localhost:3000/api/pastes", {
        body: { content: "persist-me" },
      })
    );
    const body = await readJson<CreateBody>(response);
    const count = await testPrisma.paste.count({ where: { id: body.id } });
    expect(count).toBe(1);
  });
});
