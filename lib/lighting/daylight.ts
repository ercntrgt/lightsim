// Günışığı katkısı. M3'te yer tutucu (sıfır döner); M5'te BRE split-flux +
// CIE Overcast ray tracing (three-mesh-bvh) ile gerçek hesap eklenecek.

import type { Location, Point2D, Room } from "@/types";

export interface DaylightResult {
  perPointLux: number[]; // her ızgara noktası için günışığı aydınlığı (lüks)
  dfPct: number; // ortalama daylight factor (%)
}

export function computeDaylight(
  _room: Room,
  _location: Location,
  points: Point2D[],
  _raySamples: number,
  onProgress?: (fraction: number) => void
): DaylightResult {
  onProgress?.(1);
  return { perPointLux: new Array(points.length).fill(0), dfPct: 0 };
}
