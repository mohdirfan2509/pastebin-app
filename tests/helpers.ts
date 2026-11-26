import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        "postgresql://pastebin:pastebin@localhost:5432/pastebin_test?schema=public",
    },
  },
});

export async function resetDatabase(): Promise<void> {
  await testPrisma.paste.deleteMany();
}

export function makeJsonRequest(
  url: string,
  init: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const headers = new Headers({
    "content-type": "application/json",
    ...(init.headers || {}),
  });

  return new NextRequest(url, {
    method: init.method || "POST",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

export function makeGetRequest(
  url: string,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(url, {
    method: "GET",
    headers,
  });
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
