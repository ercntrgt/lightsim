import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/server/auth";
import {
  deleteUser,
  getUserById,
  setUserStatus,
  toPublic,
} from "@/lib/server/users";
import { fail } from "@/lib/server/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["pending", "active", "rejected"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSuperAdmin();
    const { status } = patchSchema.parse(await req.json());
    const target = getUserById(params.id);
    if (!target)
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    if (target.role === "super_admin")
      return NextResponse.json(
        { error: "Süper admin durumu değiştirilemez." },
        { status: 400 }
      );
    setUserStatus(params.id, status, admin.id);
    return NextResponse.json({ ok: true, user: toPublic(getUserById(params.id)!) });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
    return fail(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();
    const target = getUserById(params.id);
    if (!target)
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    if (target.role === "super_admin")
      return NextResponse.json(
        { error: "Süper admin silinemez." },
        { status: 400 }
      );
    deleteUser(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
