import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser } from "@/lib/server/users";
import { fail } from "@/lib/server/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
  name: z.string().trim().min(2, "Ad Soyad girin."),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    // Self-kayıt → 'pending'; süper admin onaylayana dek analiz yapamaz.
    createUser({ ...body, status: "pending", role: "member" });
    return NextResponse.json({
      ok: true,
      message:
        "Kaydınız alındı. Süper admin onayından sonra analiz yapabilirsiniz.",
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: e.errors[0]?.message ?? "Geçersiz veri" },
        { status: 400 }
      );
    return fail(e);
  }
}
