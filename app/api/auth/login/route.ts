import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail, toPublic, verifyPassword } from "@/lib/server/users";
import { signSession, setSessionCookie } from "@/lib/server/auth";
import { fail } from "@/lib/server/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { email, password } = schema.parse(await req.json());
    const row = getUserByEmail(email);
    if (!row || !verifyPassword(password, row.password_hash))
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    if (row.status === "rejected")
      return NextResponse.json(
        { error: "Hesabınız reddedildi. Yöneticiyle iletişime geçin." },
        { status: 403 }
      );
    setSessionCookie(await signSession(row.id));
    // Giriş başarılı (pending olsa da girer; UI durumuna göre kısıtlar).
    return NextResponse.json({ ok: true, user: toPublic(row) });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
    return fail(e);
  }
}
