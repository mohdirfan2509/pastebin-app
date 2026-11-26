import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: string;
};

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonCreated<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(message: string, status: number): NextResponse {
  const body: ApiErrorBody = { error: message };
  return NextResponse.json(body, { status });
}

export function methodNotAllowed(allowed: string[]): NextResponse {
  return NextResponse.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: { Allow: allowed.join(", ") },
    }
  );
}
