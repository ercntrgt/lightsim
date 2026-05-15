// suncalc sarmalayıcısı: konum/tarih/saat → güneş yükseklik & azimut açısı.

import SunCalc from "suncalc";
import type { Location } from "@/types";

/** location.date + timeMinutes'tan yerel Date üretir. */
export function locationDate(loc: Location): Date {
  const [y, m, d] = loc.date.split("-").map(Number);
  const hh = Math.floor(loc.timeMinutes / 60);
  const mm = loc.timeMinutes % 60;
  return new Date(y, (m || 1) - 1, d || 1, hh, mm, 0);
}

export interface SunPos {
  altitudeDeg: number; // ufuk üstü açı (negatif = gece)
  azimuthDeg: number; // kuzeyden saat yönü (0=K, 90=D, 180=G, 270=B)
  /** Bina kuzeyine göre düzeltilmiş azimut. */
  azimuthFromBuildingDeg: number;
}

export function solarPosition(loc: Location): SunPos {
  const date = locationDate(loc);
  const p = SunCalc.getPosition(date, loc.lat, loc.lng);
  const altitudeDeg = (p.altitude * 180) / Math.PI;
  // suncalc azimut: güneyden batıya. Kuzey-tabanlıya çevir.
  let azNorth = (p.azimuth * 180) / Math.PI + 180;
  azNorth = ((azNorth % 360) + 360) % 360;
  const azB = ((azNorth - loc.buildingNorthDeg) % 360 + 360) % 360;
  return {
    altitudeDeg,
    azimuthDeg: azNorth,
    azimuthFromBuildingDeg: azB,
  };
}
