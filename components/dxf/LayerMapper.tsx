"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/stores/projectStore";
import type { ElementType } from "@/types";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Wand2 } from "lucide-react";

const LABELS: Record<ElementType, string> = {
  wall: "Duvar",
  window: "Pencere",
  door: "Kapı",
  ignore: "Yok say",
};

export function LayerMapper() {
  const dxf = useProjectStore((s) => s.dxf);
  const mapping = useProjectStore((s) => s.layerMapping);
  const setLayerType = useProjectStore((s) => s.setLayerType);
  const buildRoom = useProjectStore((s) => s.buildRoomFromDxf);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    dxf?.entities.forEach((e) => (c[e.layer] = (c[e.layer] ?? 0) + 1));
    return c;
  }, [dxf]);

  // Yalnızca geometrisi olan katmanlar; sınıflandırılanlar üstte.
  const layers = useMemo(() => {
    if (!dxf) return [];
    return dxf.layers
      .filter((l) => (counts[l] ?? 0) > 0)
      .sort((a, b) => {
        const am = (mapping[a] ?? "ignore") === "ignore" ? 1 : 0;
        const bm = (mapping[b] ?? "ignore") === "ignore" ? 1 : 0;
        if (am !== bm) return am - bm;
        return (counts[b] ?? 0) - (counts[a] ?? 0);
      });
  }, [dxf, counts, mapping]);

  if (!dxf) return null;

  const hasWall = layers.some((l) => mapping[l] === "wall");
  const hasWindow = layers.some((l) => mapping[l] === "window");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers className="h-4 w-4 text-primary" />
          Katman eşleme
        </div>
        <Badge variant={hasWall ? "success" : "warning"}>
          {hasWall ? "Duvar bulundu ✓" : "Duvar katmanı seçin"}
        </Badge>
      </div>

      <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
        Yalnızca <b>duvar</b> (ve varsa <b>pencere/kapı</b>) katmanlarını
        işaretlemeniz yeterli. Diğer tüm katmanlar otomatik olarak yok
        sayılır — hepsini eşlemek zorunda değilsiniz.
      </p>

      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {layers.map((layer) => {
          const t = mapping[layer] ?? "ignore";
          return (
            <div
              key={layer}
              className={
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 " +
                (t === "ignore" ? "bg-muted/30" : "bg-card")
              }
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={layer}>
                  {layer}
                </p>
                <p className="text-xs text-muted-foreground">
                  {counts[layer] ?? 0} eleman
                </p>
              </div>
              <Select
                value={t}
                onChange={(e) =>
                  setLayerType(layer, e.target.value as ElementType)
                }
                className="h-8 w-32 text-xs"
              >
                {(["wall", "window", "door", "ignore"] as ElementType[]).map(
                  (opt) => (
                    <option key={opt} value={opt}>
                      {LABELS[opt]}
                    </option>
                  )
                )}
              </Select>
            </div>
          );
        })}
      </div>

      <Button onClick={buildRoom} className="w-full gap-2">
        <Wand2 className="h-4 w-4" />
        Odayı oluştur
      </Button>
      {!hasWall && (
        <p className="text-xs text-amber-700">
          Duvar katmanı seçilmedi — oda, geometrinin sınır kutusundan
          tahmin edilecek (daha az hassas).
        </p>
      )}
      {hasWall && !hasWindow && (
        <p className="text-xs text-muted-foreground">
          Pencere katmanı yok — günışığı katkısı hesaplanmaz, yalnızca
          yapay aydınlatma.
        </p>
      )}
    </div>
  );
}
