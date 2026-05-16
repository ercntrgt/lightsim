import "server-only";

import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import type {
  SharedProject,
  SimulationRecord,
  SimulationSummary,
} from "@/types";

interface SimRow {
  id: string;
  user_id: string;
  file_name: string | null;
  created_at: number;
  summary_json: string;
  project_json: string;
  user_email?: string;
}

function rowToRecord(r: SimRow): SimulationRecord {
  return {
    id: r.id,
    userId: r.user_id,
    userEmail: r.user_email,
    createdAt: r.created_at,
    summary: JSON.parse(r.summary_json) as SimulationSummary,
    project: JSON.parse(r.project_json) as SharedProject,
  };
}

function buildSummary(p: SharedProject): SimulationSummary {
  const res = p.result;
  return {
    fileName: p.fileName,
    area: p.room?.area ?? 0,
    fixtureCount: p.fixtures?.length ?? 0,
    avg: res?.avg ?? 0,
    min: res?.min ?? 0,
    max: res?.max ?? 0,
    uniformityUo: res?.uniformityUo ?? 0,
    daylightFactorPct: res?.daylightFactorPct ?? 0,
  };
}

export function saveSimulation(
  userId: string,
  project: SharedProject
): SimulationRecord {
  const id = randomUUID();
  const now = Date.now();
  const summary = buildSummary(project);
  getDb()
    .prepare(
      `INSERT INTO simulations (id, user_id, file_name, created_at, summary_json, project_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      userId,
      project.fileName ?? null,
      now,
      JSON.stringify(summary),
      JSON.stringify(project)
    );
  return {
    id,
    userId,
    createdAt: now,
    summary,
    project,
  };
}

/** userId verilirse yalnız o kullanıcının; null ise (admin) hepsi. */
export function listSimulations(userId: string | null): SimulationRecord[] {
  const db = getDb();
  const rows = (
    userId
      ? db
          .prepare(
            `SELECT s.*, u.email AS user_email FROM simulations s
             JOIN users u ON u.id = s.user_id
             WHERE s.user_id = ? ORDER BY s.created_at DESC`
          )
          .all(userId)
      : db
          .prepare(
            `SELECT s.*, u.email AS user_email FROM simulations s
             JOIN users u ON u.id = s.user_id
             ORDER BY s.created_at DESC`
          )
          .all()
  ) as SimRow[];
  return rows.map(rowToRecord);
}

export function getSimulation(id: string): SimulationRecord | undefined {
  const r = getDb()
    .prepare(
      `SELECT s.*, u.email AS user_email FROM simulations s
       JOIN users u ON u.id = s.user_id WHERE s.id = ?`
    )
    .get(id) as SimRow | undefined;
  return r ? rowToRecord(r) : undefined;
}

export function deleteSimulation(id: string): void {
  getDb().prepare("DELETE FROM simulations WHERE id = ?").run(id);
}
