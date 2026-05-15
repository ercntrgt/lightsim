// EN 12464-1 referans bakım aydınlıkları ve kural tabanlı tavsiyeler.

import type { SimulationResult } from "@/types";

export const EN_TARGETS: Record<string, { label: string; lux: number }> = {
  office: { label: "Ofis / büro", lux: 500 },
  openOffice: { label: "Açık ofis", lux: 500 },
  meeting: { label: "Toplantı odası", lux: 500 },
  classroom: { label: "Derslik", lux: 300 },
  reception: { label: "Resepsiyon", lux: 300 },
  archive: { label: "Arşiv", lux: 200 },
  corridor: { label: "Koridor", lux: 100 },
  stairs: { label: "Merdiven", lux: 100 },
  technical: { label: "Teknik çizim", lux: 750 },
};

export const MIN_UNIFORMITY = 0.6; // EN 12464-1 görev alanı Uo

export function buildRecommendations(
  r: SimulationResult,
  targetLux: number
): string[] {
  const tips: string[] = [];
  if (r.avg < targetLux) {
    const ratio = targetLux / Math.max(1, r.avg);
    tips.push(
      `Ortalama aydınlık ${Math.round(r.avg)} lx, hedefin (${targetLux} lx) altında. ` +
        `Armatür akısını veya sayısını ~${ratio.toFixed(1)}× artırın.`
    );
  } else {
    tips.push(
      `Ortalama aydınlık ${Math.round(r.avg)} lx, hedefi (${targetLux} lx) karşılıyor.`
    );
  }
  if (r.uniformityUo < MIN_UNIFORMITY) {
    tips.push(
      `Düzgünlük Uo=${r.uniformityUo.toFixed(2)} < ${MIN_UNIFORMITY}. ` +
        `Armatürleri daha eşit dağıtın veya aralığı azaltın (daha çok/küçük armatür).`
    );
  }
  if (r.avg > targetLux * 1.5) {
    tips.push(
      "Aydınlık hedefin çok üzerinde — enerji tasarrufu için armatür sayısını azaltabilir veya dimleme uygulayabilirsiniz."
    );
  }
  if (r.daylightFactorPct > 0 && r.daylightFactorPct < 2) {
    tips.push(
      `Daylight factor %${r.daylightFactorPct.toFixed(1)} düşük (<%2). ` +
        "Pencere alanını artırmak doğal aydınlatmayı iyileştirir."
    );
  } else if (r.daylightFactorPct >= 2) {
    tips.push(
      `Daylight factor %${r.daylightFactorPct.toFixed(1)} — iyi doğal aydınlatma potansiyeli; gündüz yapay aydınlatma kısılabilir.`
    );
  }
  return tips;
}
