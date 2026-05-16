import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { deleteSimulation, getSimulation } from "@/lib/server/simulations";
import { fail } from "@/lib/server/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const rec = getSimulation(params.id);
    if (!rec)
      return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
    if (rec.userId !== user.id && user.role !== "super_admin")
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    return NextResponse.json({ record: rec });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const rec = getSimulation(params.id);
    if (!rec)
      return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
    if (rec.userId !== user.id && user.role !== "super_admin")
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    deleteSimulation(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
