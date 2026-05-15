"use client";

// Sonuç + plan görselini (heatmap overlay'li) PNG dataURL olarak üretir.
// Yalnızca tarayıcıda — PDF raporu için client'ta render edilip API'ye gönderilir.

import { viridisCss } from "@/lib/viz/colormap";
import type { Room, SimulationResult } from "@/types";

export function renderResultPng(
  room: Room,
  result: SimulationResult,
  px = 560
): string {
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
  const w = Math.max(0.001, maxX - minX);
  const h = Math.max(0.001, maxY - minY);
  const pad = 24;
  const scale = (px - pad * 2) / Math.max(w, h);
  const cw = Math.round(w * scale + pad * 2);
  const ch = Math.round(h * scale + pad * 2);
  const cv = document.createElement("canvas");
  cv.width = cw;
  cv.height = ch;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);

  const X = (x: number) => pad + (x - minX) * scale;
  const Y = (y: number) => ch - pad - (y - minY) * scale;

  // Heatmap hücreleri.
  const maxLux = Math.max(1e-6, result.max);
  const cell = result.spacing * scale;
  for (const g of result.grid) {
    ctx.fillStyle = viridisCss(g.lux / maxLux);
    ctx.fillRect(X(g.x) - cell / 2, Y(g.y) - cell / 2, cell + 0.5, cell + 0.5);
  }

  // Duvarlar.
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2;
  for (const wl of room.walls) {
    ctx.beginPath();
    ctx.moveTo(X(wl.start.x), Y(wl.start.y));
    ctx.lineTo(X(wl.end.x), Y(wl.end.y));
    ctx.stroke();
  }
  // Pencereler.
  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 3;
  for (const wn of room.windows) {
    ctx.beginPath();
    ctx.moveTo(X(wn.start.x), Y(wn.start.y));
    ctx.lineTo(X(wn.end.x), Y(wn.end.y));
    ctx.stroke();
  }
  return cv.toDataURL("image/png");
}
