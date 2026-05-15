// CIBSE / BRE ortalama daylight factor (analitik çapraz kontrol & rapor):
//   DF% = (T·M·A_w·θ) / (A_total·(1−ρ_avg²)) · 100

import type { Room } from "@/types";
import { polygonArea } from "@/lib/dxf/extruder";

const GLAZING_MAINTENANCE = 0.9; // M (temiz dikey cam)

export interface AverageDF {
  dfPct: number;
  glazedArea: number; // A_w (m²)
  totalSurface: number; // A_total (m²)
  avgReflectance: number; // ρ_avg
}

export function averageDaylightFactor(
  room: Room,
  visibleSkyAngleDeg = 90
): AverageDF {
  const floor = Math.max(0.5, room.area);
  const ceiling = floor;
  // Duvar alanı (segment uzunlukları × yükseklik).
  let wallLen = 0;
  for (const w of room.walls)
    wallLen += Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
  if (wallLen === 0) {
    // Dış çizgi çevresi yedeği.
    for (let i = 0; i < room.outline.length; i++) {
      const a = room.outline[i];
      const b = room.outline[(i + 1) % room.outline.length];
      wallLen += Math.hypot(b.x - a.x, b.y - a.y);
    }
  }
  const wallArea = wallLen * room.wallHeight;
  const totalSurface = floor + ceiling + wallArea;

  let glazedArea = 0;
  let tauSum = 0;
  for (const win of room.windows) {
    const w = Math.hypot(
      win.end.x - win.start.x,
      win.end.y - win.start.y
    );
    const h = Math.max(0, win.headHeight - win.sillHeight);
    const a = w * h;
    glazedArea += a;
    tauSum += a * win.transmittance;
  }
  const T = glazedArea > 0 ? tauSum / glazedArea : 0.7;

  const rAvg =
    (room.material.ceiling * ceiling +
      room.material.wall * wallArea +
      room.material.floor * floor) /
    totalSurface;

  const theta = Math.max(0, Math.min(90, visibleSkyAngleDeg));
  const denom = totalSurface * (1 - rAvg * rAvg);
  const dfPct =
    denom > 0
      ? (T * GLAZING_MAINTENANCE * glazedArea * theta) / denom * 100
      : 0;

  return {
    dfPct,
    glazedArea,
    totalSurface,
    avgReflectance: rAvg,
  };
}

// outline alanını da burada kullanılabilir kıl (extruder'dan).
export { polygonArea };
