"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/stores/projectStore";
import type { ElementType } from "@/types";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UNIT_OPTIONS, UNIT_SCALE } from "@/lib/dxf/parser";
import { detectFloors } from "@/lib/dxf/extruder";
import {
  Layers,
  Wand2,
  CheckCircle2,
  Circle,
  Ruler,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";

const LABELS: Record<ElementType, string> = {
  wall: "Duvar",
  window: "Pencere",
  door: "Kapı",
  fixture: "Armatür",
  ignore: "Yok say",
};

export function LayerMapper() {
  const dxf = useProjectStore((s) => s.dxf);
  const mapping = useProjectStore((s) => s.layerMapping);
  const setLayerType = useProjectStore((s) => s.setLayerType);
  const setDxfUnit = useProjectStore((s) => s.setDxfUnit);
  const hiddenLayers = useProjectStore((s) => s.hiddenLayers);
  const toggleLayerHidden = useProjectStore((s) => s.toggleLayerHidden);
  const selectedFloorId = useProjectStore((s) => s.selectedFloorId);
  const selectFloor = useProjectStore((s) => s.selectFloor);
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

  // Çoklu kat/bölge tespiti — gizli katmanlar hariç, canlı.
  const liveFloors = useMemo(
    () =>
      dxf ? detectFloors(dxf, mapping, new Set(hiddenLayers)) : [],
    [dxf, mapping, hiddenLayers]
  );

  if (!dxf) return null;

  const activeFloorId =
    selectedFloorId && liveFloors.some((f) => f.id === selectedFloorId)
      ? selectedFloorId
      : (liveFloors[0]?.id ?? null);

  const planW = dxf.bbox.max.x - dxf.bbox.min.x;
  const planD = dxf.bbox.max.y - dxf.bbox.min.y;
  const maxDim = Math.max(planW, planD);
  // Select değeri: dxf'in etkin ölçeğine eşleşen birim seçeneği.
  const selectedUnit =
    UNIT_OPTIONS.find((o) => o.code === dxf.insCode) ??
    UNIT_OPTIONS.find(
      (o) => UNIT_SCALE[o.code]?.scale === dxf.unitScale
    ) ??
    UNIT_OPTIONS[0];
  const unitLooksOff = maxDim < 0.5 || maxDim > 300;

  const hasWall = layers.some((l) => mapping[l] === "wall");
  const hasWindow = layers.some((l) => mapping[l] === "window");
  const hasFixture = layers.some((l) => mapping[l] === "fixture");

  // Eşleme checklist'i için tür başına seçilen katman sayısı.
  const perType = layers.reduce(
    (acc, l) => {
      const t = mapping[l];
      if (t && t !== "ignore") acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<ElementType, number>>
  );
  const CHECKLIST: { type: ElementType; required: boolean }[] = [
    { type: "wall", required: true },
    { type: "window", required: false },
    { type: "door", required: false },
    { type: "fixture", required: false },
  ];

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

      {/* Birim / ölçek — yanlış birim 3D'de duvar oranlarını bozar */}
      <div
        className={
          "space-y-2 rounded-md border p-2.5 " +
          (unitLooksOff ? "border-amber-300 bg-amber-50" : "bg-card")
        }
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Ruler className="h-4 w-4 text-primary" />
          Çizim birimi
        </div>
        <Select
          value={String(selectedUnit.code)}
          onChange={(e) => setDxfUnit(Number(e.target.value))}
          className="h-8 w-full text-xs"
        >
          {UNIT_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          Plan boyutu:{" "}
          <b>
            {planW.toFixed(2)} × {planD.toFixed(2)} m
          </b>
        </p>
        {unitLooksOff && (
          <p className="text-xs text-amber-700">
            Bu boyut bir oda için olağandışı — çizim birimi yanlış olabilir.
            Doğru birimi seçin, aksi halde 3D&apos;de duvar yükseklikleri
            orantısız görünür.
          </p>
        )}
      </div>

      {/* Çoklu kat / bölge — yan yana veya ayrı çizilmiş planlar */}
      {liveFloors.length > 1 && (
        <div className="space-y-2 rounded-md border border-violet-300 bg-violet-50 p-2.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4 text-violet-600" />
            Çoklu kat algılandı ({liveFloors.length} bölge)
          </div>
          <Select
            value={activeFloorId ?? ""}
            onChange={(e) => selectFloor(e.target.value)}
            className="h-8 w-full text-xs"
          >
            {liveFloors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-violet-700">
            Yalnızca seçilen bölge odaya dönüştürülür. Diğer katları
            tamamen yok saymak için katmanlarını göz simgesiyle de
            gizleyebilirsiniz.
          </p>
        </div>
      )}

      {/* Eşleme checklist'i */}
      <div className="space-y-1 rounded-md border bg-card p-2.5">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Eşleme durumu
        </p>
        {CHECKLIST.map(({ type, required }) => {
          const n = perType[type] ?? 0;
          const done = n > 0;
          return (
            <div key={type} className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              )}
              <span className={done ? "font-medium" : "text-muted-foreground"}>
                {LABELS[type]}
              </span>
              <span className="ml-auto text-xs">
                {done ? (
                  <span className="text-muted-foreground">
                    {n} katman ✓
                  </span>
                ) : required ? (
                  <span className="text-amber-600">önerilen</span>
                ) : (
                  <span className="text-muted-foreground/60">opsiyonel</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {layers.map((layer) => {
          const t = mapping[layer] ?? "ignore";
          const hidden = hiddenLayers.includes(layer);
          return (
            <div
              key={layer}
              className={
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 " +
                (hidden
                  ? "border-dashed bg-muted/50 opacity-60"
                  : t === "ignore"
                    ? "bg-muted/30"
                    : "bg-card")
              }
            >
              <button
                type="button"
                onClick={() => toggleLayerHidden(layer)}
                title={hidden ? "Katmanı göster" : "Katmanı gizle"}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {hidden ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={layer}>
                  {layer}
                </p>
                <p className="text-xs text-muted-foreground">
                  {counts[layer] ?? 0} eleman
                  {hidden && " · gizli"}
                </p>
              </div>
              <Select
                value={t}
                onChange={(e) =>
                  setLayerType(layer, e.target.value as ElementType)
                }
                className="h-8 w-32 text-xs"
              >
                {(
                  [
                    "wall",
                    "window",
                    "door",
                    "fixture",
                    "ignore",
                  ] as ElementType[]
                ).map((opt) => (
                  <option key={opt} value={opt}>
                    {LABELS[opt]}
                  </option>
                ))}
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
      {hasFixture && (
        <p className="text-xs text-primary">
          Armatür katmanı seçildi — &quot;Armatürler&quot; adımında bu
          katmandaki konumlara tek tıkla armatür yerleştirebilirsiniz.
        </p>
      )}
    </div>
  );
}
