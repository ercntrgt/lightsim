import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Edge'de çalışır — yalnız JWT imzasını doğrular (DB yok). Rol/durum
// kontrolü sunucu route'larında ve sayfalarda yapılır.

const AUTH_COOKIE = "ls_session";

function secret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "lightsim-insecure-dev-secret-change-me"
  );
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "string";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Paylaşım görüntüleyici herkese açık (salt-okunur sonuç).
  if (pathname === "/studio/s" || pathname.startsWith("/studio/s/")) {
    return NextResponse.next();
  }

  if (await hasValidSession(req)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/studio", "/studio/:path*", "/admin", "/admin/:path*", "/history", "/history/:path*"],
};
