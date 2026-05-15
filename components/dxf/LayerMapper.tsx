"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { classificationCoverage } from "@/lib/dxf/classifier";
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

  if (!dxf) return null;
  const coverage = Math.round(classificationCoverage(mapping) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers className="h-4 w-4 text-primary" />
          Katman eşleme
        </div>
        <Badge variant={coverage >= 80 ? "success" : "warning"}>
          %{coverage} eşlendi
        </Badge>
      </div>

      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {dxf.layers.map((layer) => (
          <div
            key={layer}
            className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5"
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
              value={mapping[layer] ?? "ignore"}
              onChange={(e) =>
                setLayerType(layer, e.target.value as ElementType)
              }
              className="h-8 w-32 text-xs"
            >
              {(["wall", "window", "door", "ignore"] as ElementType[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {LABELS[t]}
                  </option>
                )
              )}
            </Select>
          </div>
        ))}
      </div>

      <Button onClick={buildRoom} className="w-full gap-2">
        <Wand2 className="h-4 w-4" />
        Odayı oluştur
      </Button>
      <p className="text-xs text-muted-foreground">
        Otomatik tahmin AIA (A-WALL…) ve Türkçe adlandırmayı destekler; yanlış
        eşlemeleri yukarıdan düzeltebilirsiniz.
      </p>
    </div>
  );
}
