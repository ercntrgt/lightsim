import "server-only";

import { NextResponse } from "next/server";
import { HttpError } from "./auth";

/** Route handler hatalarını tek tip JSON yanıta çevirir. */
export function fail(e: unknown): NextResponse {
  if (e instanceof HttpError)
    return NextResponse.json({ error: e.message }, { status: e.status });
  const msg = e instanceof Error ? e.message : "Sunucu hatası";
  return NextResponse.json({ error: msg }, { status: 400 });
}
