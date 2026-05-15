// Klasik lümen yöntemi: E_avg = (N·Φ·CU·MF) / A
// CU, oda indeksi (k) + yüzey yansıtıcılıklarından gömülü tablodan
// bilineer-clamp interpolasyonla bulunur.

import type { Fixture, Room } from "@/types";
import { FIXTURE_TYPES } from "@/lib/lighting/fixtures";
import { clamp } from "@/lib/utils";

// Oda indeksi satırları:
const CU_K = [0.6, 0.8, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
// Sütunlar: ρtavan/ρduvar/ρzemin kombinasyonu
// 0: 0.7/0.5/0.2  1: 0.7/0.3/0.2  2: 0.5/0.5/0.2  3: 0.5/0.3/0.2  4: 0.3/0.3/0.2
const CU_TABLE: number[][] = [
  [0.28, 0.24, 0.26, 0.23, 0.21], // k=0.6
  [0.36, 0.31, 0.34, 0.3, 0.27], // k=0.8
  [0.42, 0.37, 0.4, 0.35, 0.32], // k=1.0
  [0.48, 0.42, 0.45, 0.4, 0.37], // k=1.25
  [0.53, 0.47, 0.5, 0.45, 0.41], // k=1.5
  [0.59, 0.53, 0.56, 0.51, 0.47], // k=2.0
  [0.64, 0.58, 0.6, 0.55, 0.51], // k=2.5
  [0.67, 0.61, 0.63, 0.58, 0.54], // k=3.0
  [0.71, 0.65, 0.67, 0.62, 0.58], // k=4.0
  [0.74, 0.68, 0.7, 0.65, 0.61], // k=5.0
];

function reflCombo(ceiling: number, wall: number): number {
  const cT = ceiling >= 0.6 ? 0.7 : ceiling >= 0.4 ? 0.5 : 0.3;
  const wT = wall >= 0.4 ? 0.5 : 0.3;
  if (cT === 0.7 && wT === 0.5) return 0;
  if (cT === 0.7 && wT === 0.3) return 1;
  if (cT === 0.5 && wT === 0.5) return 2;
  if (cT === 0.5 && wT === 0.3) return 3;
  return 4; // 0.3/0.3
}

/** Oda indeksi k = (L·W) / (Hm·(L+W)), Hm = duvar − çalışma düzlemi. */
export function roomIndex(room: Room): number {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of room.outline) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const L = Math.max(0.1, maxX - minX);
  const W = Math.max(0.1, maxY - minY);
  const Hm = Math.max(0.2, room.wallHeight - room.workplaneHeight);
  return (L * W) / (Hm * (L + W));
}

/** CU tablosundan k üzerinde interpolasyonla katsayı. */
export function coefficientOfUtilization(room: Room): number {
  const col = reflCombo(room.material.ceiling, room.material.wall);
  const k = clamp(roomIndex(room), CU_K[0], CU_K[CU_K.length - 1]);
  let i = 0;
  while (i < CU_K.length - 1 && CU_K[i + 1] < k) i++;
  const k0 = CU_K[i];
  const k1 = CU_K[Math.min(i + 1, CU_K.length - 1)];
  const v0 = CU_TABLE[i][col];
  const v1 = CU_TABLE[Math.min(i + 1, CU_K.length - 1)][col];
  const t = k1 === k0 ? 0 : (k - k0) / (k1 - k0);
  return v0 + (v1 - v0) * t;
}

export interface LumenResult {
  eAvg: number; // ortalama aydınlık (lüks)
  cu: number;
  roomIndex: number;
  totalLumens: number;
  fixtureCount: number;
}

export function lumenMethod(room: Room, fixtures: Fixture[]): LumenResult {
  const totalLumens = fixtures.reduce(
    (s, f) => s + FIXTURE_TYPES[f.typeKey].lumens,
    0
  );
  const cu = coefficientOfUtilization(room);
  const A = Math.max(0.5, room.area);
  const eAvg = (totalLumens * cu * room.maintenanceFactor) / A;
  return {
    eAvg,
    cu,
    roomIndex: roomIndex(room),
    totalLumens,
    fixtureCount: fixtures.length,
  };
}
