import { NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  jsonCreated,
  jsonError,
  methodNotAllowed,
} from "@/lib/api-response";
import { createPaste } from "@/lib/paste-service";
import { getNow, InvalidTestTimeError } from "@/lib/time";
import { createPasteSchema, formatZodError } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON request body", 400);
  }

  try {
    const input = createPasteSchema.parse(body);
    const now = getNow(request.headers);
    const result = await createPaste(input, now);
    return jsonCreated(result);
  } catch (error) {
    if (error instanceof InvalidTestTimeError) {
      return jsonError(error.message, 400);
    }
    if (error instanceof ZodError) {
      return jsonError(formatZodError(error), 400);
    }
    console.error("POST /api/pastes failed:", error);
    return jsonError("Internal server error", 500);
  }
}

export function GET() {
  return methodNotAllowed(["POST"]);
}

export function PUT() {
  return methodNotAllowed(["POST"]);
}

export function PATCH() {
  return methodNotAllowed(["POST"]);
}

export function DELETE() {
  return methodNotAllowed(["POST"]);
}
