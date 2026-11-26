import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { jsonError, jsonOk, methodNotAllowed } from "@/lib/api-response";
import { PasteNotFoundError, retrievePaste } from "@/lib/paste-service";
import { getNow, InvalidTestTimeError } from "@/lib/time";
import { formatZodError, pasteIdSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = pasteIdSchema.parse(rawId);
    const now = getNow(request.headers);
    const paste = await retrievePaste(id, now);
    return jsonOk(paste);
  } catch (error) {
    if (error instanceof InvalidTestTimeError) {
      return jsonError(error.message, 400);
    }
    if (error instanceof ZodError) {
      return jsonError(formatZodError(error), 400);
    }
    if (error instanceof PasteNotFoundError) {
      return jsonError(error.message, 404);
    }
    console.error("GET /api/pastes/:id failed:", error);
    return jsonError("Internal server error", 500);
  }
}

export function POST() {
  return methodNotAllowed(["GET"]);
}

export function PUT() {
  return methodNotAllowed(["GET"]);
}

export function PATCH() {
  return methodNotAllowed(["GET"]);
}

export function DELETE() {
  return methodNotAllowed(["GET"]);
}
