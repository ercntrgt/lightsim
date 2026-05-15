// PDF rapor üretimi — sunucu tarafı @react-pdf/renderer (Node runtime).
// Görseller client'ta render edilip dataURL olarak gelir (sunucuda WebGL yok).

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildReportElement, type ReportData } from "@/lib/report/ReportDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as ReportData;
    if (!data?.room || !data?.result)
      return NextResponse.json(
        { error: "Eksik veri (room/result)" },
        { status: 400 }
      );
    const element = buildReportElement(data);
    const buffer = await renderToBuffer(element);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="lightsim-rapor.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Rapor hatası" },
      { status: 500 }
    );
  }
}
