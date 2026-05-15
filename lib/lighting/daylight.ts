// Günışığı katkısı: ray tracing (CIE Overcast → DF; seçili gök → lüks).

import type { Location, Point2D, Room } from "@/types";
import { rayTraceGrid, type SkyFns } from "@/lib/lighting/raytracer";
import {
  overcastLuminance,
  clearSkyHorizontalLux,
  DESIGN_OVERCAST_LUX,
} from "@/lib/solar/irradiance";

export interface DaylightResult {
  perPointLux: number[]; // seçili gök altında günışığı aydınlığı (lüks)
  dfPct: number; // ortalama daylight factor (%) — CIE overcast
}

export function computeDaylight(
  room: Room,
  location: Location,
  points: Point2D[],
  raySamples: number,
  onProgress?: (fraction: number) => void
): DaylightResult {
  if (points.length === 0 || room.windows.length === 0)
    return { perPointLux: new Array(points.length).fill(0), dfPct: 0 };

  let selected: (cz: number) => number;
  if (location.skyModel === "clear") {
    const Eclear = clearSkyHorizontalLux(location);
    const Luni = Eclear / Math.PI; // tekdüze gök parıltısı (cd/m²)
    selected = () => Luni;
  } else {
    selected = overcastLuminance; // overcast: lüks de overcast parıltısından
  }
  const sky: SkyFns = { overcast: overcastLuminance, selected };

  const { selLux, overcastLux } = rayTraceGrid(
    room,
    points,
    raySamples,
    sky,
    room.workplaneHeight,
    onProgress
  );

  // Ortalama daylight factor = 100 · ⟨E_overcast⟩ / E_dış(10.000 lx)
  let sum = 0;
  for (const v of overcastLux) sum += v;
  const dfPct =
    overcastLux.length > 0
      ? (100 * (sum / overcastLux.length)) / DESIGN_OVERCAST_LUX
      : 0;

  return { perPointLux: selLux, dfPct };
}
