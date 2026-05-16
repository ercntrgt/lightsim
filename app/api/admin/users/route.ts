import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/server/auth";
import { createUser, listUsers, toPublic } from "@/lib/server/users";
import { fail } from "@/lib/server/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    return NextResponse.json({ users: listUsers() });
  } catch (e) {
    return fail(e);
  }
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
  name: z.string().trim().min(2),
  role: z.enum(["member", "super_admin"]).default("member"),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = createSchema.parse(await req.json());
    // Admin tarafından açılan hesap otomatik onaylı (aktif).
    const u = createUser({
      ...body,
      status: "active",
      approvedBy: admin.id,
    });
    return NextResponse.json({ ok: true, user: toPublic(u) });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: e.errors[0]?.message ?? "Geçersiz veri" },
        { status: 400 }
      );
    return fail(e);
  }
}
