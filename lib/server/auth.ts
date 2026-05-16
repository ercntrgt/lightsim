import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getUserById, toPublic, type UserRow } from "./users";
import type { PublicUser } from "@/types";

export const AUTH_COOKIE = "ls_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    // Tek instance VPS'te kabul edilebilir geri dönüş; üretimde AUTH_SECRET
    // mutlaka ayarlanmalı (oturumlar yeniden başlatınca geçersiz olur).
    console.warn("[auth] AUTH_SECRET tanımlı değil — geçici anahtar kullanılıyor.");
    return new TextEncoder().encode("lightsim-insecure-dev-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
}

/** Geçerli oturumdaki kullanıcı (DB'den, güncel rol/durum). */
export async function getSessionUser(): Promise<PublicUser | null> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const uid = await verifyToken(token);
  if (!uid) return null;
  const row = getUserById(uid) as UserRow | undefined;
  return row ? toPublic(row) : null;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Oturum şart. */
export async function requireUser(): Promise<PublicUser> {
  const u = await getSessionUser();
  if (!u) throw new HttpError(401, "Giriş yapmalısınız.");
  return u;
}

/** Onaylı (aktif) üye veya süper admin şart — analiz/kayıt için. */
export async function requireActive(): Promise<PublicUser> {
  const u = await requireUser();
  if (u.status !== "active")
    throw new HttpError(
      403,
      u.status === "pending"
        ? "Üyeliğiniz onay bekliyor."
        : "Hesabınız aktif değil."
    );
  return u;
}

export async function requireSuperAdmin(): Promise<PublicUser> {
  const u = await requireUser();
  if (u.role !== "super_admin")
    throw new HttpError(403, "Bu işlem için süper admin yetkisi gerekir.");
  return u;
}
