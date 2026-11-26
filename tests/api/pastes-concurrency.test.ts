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

describe("concurrent view consumption", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("never allows more successful retrievals than max_views", async () => {
    const createResponse = await POST(
      makeJsonRequest("http://localhost:3000/api/pastes", {
        body: { content: "race", max_views: 5 },
      })
    );
    const created = await readJson<{ id: string }>(createResponse);
    expect(createResponse.status).toBe(201);

    const requests = Array.from({ length: 20 }, () =>
      GET(makeGetRequest(`http://localhost:3000/api/pastes/${created.id}`), {
        params: Promise.resolve({ id: created.id }),
      })
    );

    const responses = await Promise.all(requests);
    const successCount = responses.filter((r) => r.status === 200).length;
    const notFoundCount = responses.filter((r) => r.status === 404).length;

    expect(successCount).toBe(5);
    expect(notFoundCount).toBe(15);

    const stored = await testPrisma.paste.findUnique({
      where: { id: created.id },
    });
    expect(stored?.views).toBe(5);
  });

  it("allows only one success for max_views = 1 under concurrency", async () => {
    const createResponse = await POST(
      makeJsonRequest("http://localhost:3000/api/pastes", {
        body: { content: "single-race", max_views: 1 },
      })
    );
    const created = await readJson<{ id: string }>(createResponse);

    const responses = await Promise.all(
      Array.from({ length: 15 }, () =>
        GET(makeGetRequest(`http://localhost:3000/api/pastes/${created.id}`), {
          params: Promise.resolve({ id: created.id }),
        })
      )
    );

    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 404)).toHaveLength(14);
  });
});
