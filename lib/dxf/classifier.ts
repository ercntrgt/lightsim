// Katman adından duvar/pencere/kapı tahmini. Kullanıcı LayerMapper ile
// elle düzeltebilir. AIA (A-WALL...) ve Türkçe adlandırma desteklenir.

import type { ElementType, LayerMapping } from "@/types";

interface Rule {
  type: ElementType;
  patterns: RegExp[];
}

// Sıra önemli: pencere/kapı, duvardan ÖNCE denenir (A-GLAZ "wall" içermez ama
// "duvar pencere" gibi adlarda öncelik camda olmalı).
const RULES: Rule[] = [
  {
    type: "window",
    patterns: [
      /wind(ow)?/i,
      /pencere/i,
      /\bcam\b/i,
      /glaz/i,
      /a-?glaz/i,
      /a-?wind/i,
    ],
  },
  {
    type: "door",
    patterns: [/door/i, /kap[iı]/i, /a-?door/i],
  },
  {
    type: "wall",
    patterns: [
      /wall/i,
      /duvar/i,
      /a-?wall/i,
      /\bmur\b/i,
      /partition/i,
      /b[oö]lme/i,
    ],
  },
];

/** Tek bir katman adını sınıflandırır. */
export function classifyLayer(layer: string): ElementType {
  const name = layer.trim();
  for (const rule of RULES) {
    if (rule.patterns.some((re) => re.test(name))) return rule.type;
  }
  return "ignore";
}

/** Tüm katmanlar için otomatik eşleme üretir. */
export function autoClassify(layers: string[]): LayerMapping {
  const map: LayerMapping = {};
  for (const l of layers) map[l] = classifyLayer(l);
  return map;
}

/** Otomatik tahminin kaç katmanı "ignore" dışı eşlediğinin oranı (bilgi amaçlı). */
export function classificationCoverage(mapping: LayerMapping): number {
  const vals = Object.values(mapping);
  if (vals.length === 0) return 0;
  const mapped = vals.filter((v) => v !== "ignore").length;
  return mapped / vals.length;
}
