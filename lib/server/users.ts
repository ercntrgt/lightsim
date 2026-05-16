import "server-only";

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import type { PublicUser, UserRole, UserStatus } from "@/types";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  created_at: number;
  approved_at: number | null;
  approved_by: string | null;
}

export function toPublic(u: UserRow): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
    approvedAt: u.approved_at,
  };
}

export function getUserByEmail(email: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRow
    | undefined;
}

export function createUser(input: {
  email: string;
  password: string;
  name: string;
  status?: UserStatus;
  role?: UserRole;
  approvedBy?: string;
}): UserRow {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  if (getUserByEmail(email)) throw new Error("E-posta zaten kayıtlı.");
  const now = Date.now();
  const status: UserStatus = input.status ?? "pending";
  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, role, status, created_at, approved_at, approved_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    email,
    input.name.trim() || email,
    bcrypt.hashSync(input.password, 10),
    input.role ?? "member",
    status,
    now,
    status === "active" ? now : null,
    input.approvedBy ?? null
  );
  return getUserById(id)!;
}

export function listUsers(): PublicUser[] {
  const rows = getDb()
    .prepare("SELECT * FROM users ORDER BY created_at DESC")
    .all() as UserRow[];
  return rows.map(toPublic);
}

export function setUserStatus(
  id: string,
  status: UserStatus,
  approvedBy: string
): void {
  getDb()
    .prepare(
      "UPDATE users SET status=?, approved_at=?, approved_by=? WHERE id=?"
    )
    .run(status, status === "active" ? Date.now() : null, approvedBy, id);
}

export function deleteUser(id: string): void {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}
