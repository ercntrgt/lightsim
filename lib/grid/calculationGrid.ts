// Zemin düzleminde hesap noktaları ızgarası ve istatistikleri.

import type { Point2D, Room } from "@/types";

/** Ray-casting nokta-poligon içi testi. */
export function pointInPolygon(p: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersect =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface CalcGrid {
  points: Point2D[]; // çalışma düzlemi noktaları (m, oda koordinatı)
  cols: number;
  rows: number;
  spacing: number;
  origin: Point2D; // ızgara sol-alt köşesi
}

/** Oda dış çizgisi içinde, verilen aralıkla nokta ızgarası üretir. */
export function buildGrid(room: Room, spacing: number): CalcGrid {
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
  // Hücre merkezlerinden başla (kenar etkisini azaltır).
  const x0 = minX + spacing / 2;
  const y0 = minY + spacing / 2;
  const cols = Math.max(1, Math.floor((maxX - minX) / spacing));
  const rows = Math.max(1, Math.floor((maxY - minY) / spacing));
  const points: Point2D[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pt = { x: x0 + c * spacing, y: y0 + r * spacing };
      if (pointInPolygon(pt, room.outline)) points.push(pt);
    }
  }
  return {
    points,
    cols,
    rows,
    spacing,
    origin: { x: minX, y: minY },
  };
}

export interface GridStats {
  avg: number;
  min: number;
  max: number;
  uniformityUo: number; // Emin / Eavg
  uniformityU1: number; // Emin / Emax
}

export function gridStats(values: number[]): GridStats {
  if (!values.length)
    return { avg: 0, min: 0, max: 0, uniformityUo: 0, uniformityU1: 0 };
  let sum = 0,
    min = Infinity,
    max = -Infinity;
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const avg = sum / values.length;
  return {
    avg,
    min,
    max,
    uniformityUo: avg > 0 ? min / avg : 0,
    uniformityU1: max > 0 ? min / max : 0,
  };
}
