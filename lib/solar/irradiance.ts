// ASHRAE Clear Sky modeli (aylık A/B/C) + CIE Overcast sabitleri.

import type { Location } from "@/types";
import { locationDate, solarPosition } from "@/lib/solar/position";

// 21'inci gün ASHRAE katsayıları (0=Ocak … 11=Aralık).
const A = [1202, 1187, 1164, 1130, 1106, 1092, 1093, 1107, 1136, 1166, 1190, 1204]; // W/m²
const B = [
  0.141, 0.142, 0.149, 0.164, 0.177, 0.185, 0.186, 0.182, 0.165, 0.152, 0.144,
  0.141,
];
const C = [
  0.103, 0.104, 0.109, 0.12, 0.13, 0.137, 0.138, 0.134, 0.121, 0.111, 0.106,
  0.103,
];

// CIE Standart Overcast tasarım göğü: dış difüz yatay aydınlık 10.000 lx.
export const DESIGN_OVERCAST_LUX = 10000;
// E = (7/9)·π·Lz  →  Lz ≈ 4093 cd/m²
export const ZENITH_LUMINANCE = DESIGN_OVERCAST_LUX / ((7 / 9) * Math.PI);

/** CIE Overcast gök parıltısı; cz = zenit kosinüsü (ışın +Z bileşeni). */
export function overcastLuminance(cz: number): number {
  return (ZENITH_LUMINANCE * (1 + 2 * Math.max(0, cz))) / 3;
}

// Genel ışık (global) için tipik ışıksal etkinlik.
const LUMINOUS_EFFICACY = 115; // lm/W

/** ASHRAE açık gök ile global yatay aydınlık (lüks). Güneş ufkun altındaysa 0. */
export function clearSkyHorizontalLux(loc: Location): number {
  const { altitudeDeg } = solarPosition(loc);
  if (altitudeDeg <= 1) return 0;
  const month = locationDate(loc).getMonth();
  const sinB = Math.sin((altitudeDeg * Math.PI) / 180);
  const Idn = A[month] * Math.exp(-B[month] / sinB); // direkt normal W/m²
  const Idiff = C[month] * Idn; // difüz yatay W/m²
  const Iglobal = Idn * sinB + Idiff; // global yatay W/m²
  return Iglobal * LUMINOUS_EFFICACY;
}
