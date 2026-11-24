import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { reportError, toErrorBody, toStatus } from "@/lib/errors/http";

export async function getRequestId(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-request-id") ?? crypto.randomUUID();
}

export async function ok<T>(
  data: T,
  status = 200,
  responseHeaders?: HeadersInit,
) {
  return NextResponse.json(
    { data, meta: { requestId: await getRequestId() } },
    { status, headers: responseHeaders },
  );
}

export async function paginated<T>(
  data: T[],
  pagination: { nextCursor: string | null; hasMore: boolean },
  status = 200,
) {
  return NextResponse.json(
    {
      data,
      meta: { ...pagination, requestId: await getRequestId() },
    },
    { status },
  );
}

export async function errorResponse(error: unknown, status?: number) {
  const requestId = await getRequestId();
  reportError(error, requestId);

  return NextResponse.json(toErrorBody(error, requestId), {
    status: status ?? toStatus(error),
  });
}
