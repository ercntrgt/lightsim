import "server-only";

// SQLite (better-sqlite3) tekil bağlantı + şema migrasyonu + süper admin
// tohumlama. Yalnızca Node.js runtime'ında çalışır (Edge/middleware'de
// kullanılmaz). Veri dosyası DATABASE_PATH ile kalıcı volume'a yönlendirilir.

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

declare global {
  // eslint-disable-next-line no-var
  var __lightsimDb: Database.Database | undefined;
}

function dbPath(): string {
  return process.env.DATABASE_PATH || join(process.cwd(), "data", "lightsim.db");
}

function migrate(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'member',
      status        TEXT NOT NULL DEFAULT 'pending',
      created_at    INTEGER NOT NULL,
      approved_at   INTEGER,
      approved_by   TEXT
    );
    CREATE TABLE IF NOT EXISTS simulations (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name    TEXT,
      created_at   INTEGER NOT NULL,
      summary_json TEXT NOT NULL,
      project_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sim_user ON simulations(user_id, created_at DESC);
  `);
}

function seedSuperAdmin(db: Database.Database) {
  const email = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "";
  if (!email || !password) {
    console.warn(
      "[db] SUPER_ADMIN_EMAIL/PASSWORD tanımlı değil — süper admin tohumlanmadı."
    );
    return;
  }
  const now = Date.now();
  const existing = db
    .prepare("SELECT id, role, status FROM users WHERE email = ?")
    .get(email) as { id: string; role: string; status: string } | undefined;

  if (!existing) {
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role, status, created_at, approved_at)
       VALUES (?, ?, ?, ?, 'super_admin', 'active', ?, ?)`
    ).run(
      randomUUID(),
      email,
      "Süper Admin",
      bcrypt.hashSync(password, 10),
      now,
      now
    );
    console.log(`[db] Süper admin oluşturuldu: ${email}`);
  } else if (existing.role !== "super_admin" || existing.status !== "active") {
    db.prepare(
      "UPDATE users SET role='super_admin', status='active', approved_at=? WHERE id=?"
    ).run(now, existing.id);
    console.log(`[db] Süper admin yükseltildi: ${email}`);
  }
}

export function getDb(): Database.Database {
  if (global.__lightsimDb) return global.__lightsimDb;
  const file = dbPath();
  mkdirSync(dirname(file), { recursive: true });
  const db = new Database(file);
  migrate(db);
  seedSuperAdmin(db);
  global.__lightsimDb = db;
  return db;
}
