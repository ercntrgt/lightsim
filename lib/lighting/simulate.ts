// Simülasyon çekirdeği (saf fonksiyon — Web Worker içinde çalışır).
// M3: yapay aydınlatma + ızgara + lümen yöntemi çapraz kontrol.
// M5: günışığı (ray tracing) katkısı buraya eklenecek.

import type {
  Fixture,
  GridPoint,
  Location,
  Room,
  SimulationResult,
  SimulationSettings,
} from "@/types";
import { FIXTURE_TYPES, fixtureIlluminance } from "@/lib/lighting/fixtures";
import { buildGrid, gridStats } from "@/lib/grid/calculationGrid";
import { lumenMethod } from "@/lib/lighting/lumenMethod";
import { computeDaylight } from "@/lib/lighting/daylight";

export interface SimPayload {
  room: Room;
  fixtures: Fixture[];
  location: Location;
  settings: SimulationSettings;
}

export type ProgressFn = (fraction: number) => void;

export function runSimulation(
  payload: SimPayload,
  onProgress?: ProgressFn
): SimulationResult {
  const t0 = Date.now();
  const { room, fixtures, location, settings } = payload;
  const grid = buildGrid(room, settings.gridSpacing);
  const n = grid.points.length || 1;

  // Günışığı: noktaların gök-görünürlük faktörü + ortalama DF (M5).
  const daylight =
    settings.includeDaylight && room.windows.length > 0
      ? computeDaylight(room, location, grid.points, settings.raySamples, (f) =>
          onProgress?.(f * 0.7)
        )
      : { perPointLux: new Array(n).fill(0), dfPct: 0 };

  const planeZ = room.workplaneHeight;
  const gp: GridPoint[] = [];
  let reported = 0;

  for (let i = 0; i < grid.points.length; i++) {
    const p = grid.points[i];
    let artificial = 0;
    if (settings.includeArtificial) {
      for (const f of fixtures) {
        artificial += fixtureIlluminance(
          FIXTURE_TYPES[f.typeKey],
          f.position,
          p.x,
          p.y,
          planeZ
        );
      }
      // Bakım faktörü: sürdürülen (maintained) aydınlık — lümen yöntemiyle
      // tutarlı olması için ızgaraya da uygulanır.
      artificial *= room.maintenanceFactor;
    }
    const dl = daylight.perPointLux[i] ?? 0;
    gp.push({
      x: p.x,
      y: p.y,
      artificialLux: artificial,
      daylightLux: dl,
      lux: artificial + dl,
    });
    const frac = 0.7 + (0.3 * (i + 1)) / n;
    if (frac - reported >= 0.02) {
      reported = frac;
      onProgress?.(frac);
    }
  }

  const stats = gridStats(gp.map((g) => g.lux));
  const lm = lumenMethod(room, fixtures);
  onProgress?.(1);

  return {
    grid: gp,
    cols: grid.cols,
    rows: grid.rows,
    spacing: grid.spacing,
    origin: grid.origin,
    avg: stats.avg,
    min: stats.min,
    max: stats.max,
    uniformityUo: stats.uniformityUo,
    uniformityU1: stats.uniformityU1,
    daylightFactorPct: daylight.dfPct,
    lumenMethodAvg: lm.eAvg,
    computedAt: Date.now(),
    durationMs: Date.now() - t0,
  };
}
