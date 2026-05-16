// Var olan simülasyon sonucundan yapay / günışığı kipine özgü, KENDİ İÇİNDE
// ÖZERK bir SimulationResult türetir (yeniden hesap gerekmez — ızgara zaten
// artificialLux ve daylightLux'u ayrı tutuyor). İki ayrı PDF için kullanılır.

import type { GridPoint, SimulationResult } from "@/types";
import { gridStats } from "@/lib/grid/calculationGrid";

export type ReportMode = "combined" | "artificial" | "daylight";

export function deriveModeResult(
  r: SimulationResult,
  mode: ReportMode
): SimulationResult {
  if (mode === "combined") return r;

  const pick = (g: GridPoint) =>
    mode === "artificial" ? g.artificialLux : g.daylightLux;

  const grid: GridPoint[] = r.grid.map((g) => ({
    ...g,
    lux: pick(g),
  }));
  const st = gridStats(grid.map((g) => g.lux));

  return {
    ...r,
    grid,
    avg: st.avg,
    min: st.min,
    max: st.max,
    uniformityUo: st.uniformityUo,
    uniformityU1: st.uniformityU1,
    // Günışığı raporu DF'yi korur; yapay rapor için anlamsız → 0.
    daylightFactorPct: mode === "daylight" ? r.daylightFactorPct : 0,
    // Lümen yöntemi çapraz kontrolü yalnız yapay aydınlatma için anlamlı.
    lumenMethodAvg: mode === "artificial" ? r.lumenMethodAvg : 0,
  };
}

/** Sonuçta gerçekten yapay/günışığı katkısı var mı? */
export function hasContribution(
  r: SimulationResult,
  mode: "artificial" | "daylight"
): boolean {
  if (mode === "daylight")
    return r.daylightFactorPct > 0 || r.grid.some((g) => g.daylightLux > 0);
  return r.grid.some((g) => g.artificialLux > 0);
}
