// Paylaşım linki — proje durumunu URL'ye gömer (harici servis/DB gerekmez).
// Opsiyonel yükseltme: KV_REST_API_URL varsa kısa id ile saklanabilir.

import { NextRequest, NextResponse } from "next/server";
import { encodeShare, decodeShare } from "@/lib/share";
import type { SharedProject } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SharedProject;
    if (!body || typeof body !== "object")
      return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
    const d = encodeShare(body);
    const origin = req.nextUrl.origin;
    return NextResponse.json({
      url: `${origin}/studio/s?d=${d}`,
      path: `/studio/s?d=${d}`,
      bytes: d.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Kodlama başarısız" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const d = req.nextUrl.searchParams.get("d");
  if (!d) return NextResponse.json({ error: "d parametresi yok" }, { status: 400 });
  try {
    const project = decodeShare(d);
    return NextResponse.json({ ok: true, project });
  } catch {
    return NextResponse.json({ error: "Çözümlenemedi" }, { status: 400 });
  }
}
