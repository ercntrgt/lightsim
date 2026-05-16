import { NextRequest, NextResponse } from "next/server";
import { requireActive, requireUser } from "@/lib/server/auth";
import { listSimulations, saveSimulation } from "@/lib/server/simulations";
import { fail } from "@/lib/server/respond";
import type { SharedProject } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const scopeAll =
      req.nextUrl.searchParams.get("scope") === "all" &&
      user.role === "super_admin";
    return NextResponse.json({
      simulations: listSimulations(scopeAll ? null : user.id),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireActive();
    const project = (await req.json()) as SharedProject;
    if (!project || typeof project !== "object" || !project.result)
      return NextResponse.json(
        { error: "Kaydedilecek sonuç yok." },
        { status: 400 }
      );
    const rec = saveSimulation(user.id, project);
    return NextResponse.json({ ok: true, id: rec.id, summary: rec.summary });
  } catch (e) {
    return fail(e);
  }
}
