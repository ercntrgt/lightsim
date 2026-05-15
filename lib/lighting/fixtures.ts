// Hazır armatür kütüphanesi ve nokta-kaynak aydınlık hesabı.
// Saf fonksiyonlar — Web Worker içinde de kullanılır.

import type { FixtureKey, FixtureType, Point3D } from "@/types";

export const FIXTURE_TYPES: Record<FixtureKey, FixtureType> = {
  led_panel_60: {
    key: "led_panel_60",
    name: "LED Panel 60×60",
    lumens: 4000,
    power: 36,
    cct: 4000,
    beamAngle: 120,
    ldc: "cosine",
  },
  downlight_18: {
    key: "downlight_18",
    name: "Downlight 18W",
    lumens: 1800,
    power: 18,
    cct: 3000,
    beamAngle: 90,
    ldc: "cosine",
  },
  linear_led_1200: {
    key: "linear_led_1200",
    name: "Linear LED 1200mm",
    lumens: 3600,
    power: 36,
    cct: 4000,
    beamAngle: 120,
    ldc: "cosine",
  },
  spot_35: {
    key: "spot_35",
    name: "Spot 35W (halojen eşd.)",
    lumens: 450,
    power: 5,
    cct: 2700,
    beamAngle: 36,
    ldc: "spot",
  },
};

export const FIXTURE_LIST = Object.values(FIXTURE_TYPES);

/**
 * Tek armatürün yatay çalışma düzlemindeki bir noktada oluşturduğu
 * doğrudan aydınlık (lüks). Nokta kaynak + ters kare + LDC.
 *
 * - cosine (Lambert): I(γ) = (Φ/π)·cosγ
 * - spot: koni içinde I(γ) = Φ / (2π(1−cos(β/2)))·cosγ, dışında 0
 * γ: armatürün aşağı eksenine göre açı; θ_inc: yüzey normaline göre açı
 * (yatay düzlem için ikisi de aynı: cosγ = Δh / r).
 */
export function fixtureIlluminance(
  type: FixtureType,
  fixturePos: Point3D,
  px: number,
  py: number,
  planeZ: number
): number {
  const dx = px - fixturePos.x;
  const dy = py - fixturePos.y;
  const dz = fixturePos.z - planeZ; // montaj, düzlemin üstünde
  if (dz <= 0.01) return 0;
  const r2 = dx * dx + dy * dy + dz * dz;
  const r = Math.sqrt(r2);
  const cosGamma = dz / r; // hem yayılım hem geliş açısı kosinüsü
  const gamma = Math.acos(Math.min(1, Math.max(-1, cosGamma)));

  let I0: number;
  if (type.ldc === "spot") {
    const half = (type.beamAngle * Math.PI) / 180 / 2;
    if (gamma > half) return 0;
    I0 = type.lumens / (2 * Math.PI * (1 - Math.cos(half)));
  } else {
    I0 = type.lumens / Math.PI; // Lambert
  }
  const I = I0 * cosGamma; // cosine LDC
  // E = I·cosθ_inc / r²  (cosθ_inc = cosGamma yatay düzlemde)
  return (I * cosGamma) / r2;
}
