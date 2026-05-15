"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Trash2, Plus, LayoutGrid } from "lucide-react";
import { FIXTURE_LIST, FIXTURE_TYPES } from "@/lib/lighting/fixtures";
import { useProjectStore } from "@/stores/projectStore";
import { extractFixturePositions } from "@/lib/dxf/extruder";
import { useToast } from "@/components/ui/toast";
import type { FixtureKey } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function FixtureLibrary({
  selectedKey,
  onSelectKey,
}: {
  selectedKey: FixtureKey | null;
  onSelectKey: (k: FixtureKey | null) => void;
}) {
  const fixtures = useProjectStore((s) => s.fixtures);
  const removeFixture = useProjectStore((s) => s.removeFixture);
  const room = useProjectStore((s) => s.room);
  const dxf = useProjectStore((s) => s.dxf);
  const layerMapping = useProjectStore((s) => s.layerMapping);
  const placeFixturesFromDxf = useProjectStore((s) => s.placeFixturesFromDxf);
  const { success } = useToast();

  const [dxfType, setDxfType] = useState<FixtureKey>("led_panel_60");

  const dxfCount = useMemo(
    () => (dxf ? extractFixturePositions(dxf, layerMapping).length : 0),
    [dxf, layerMapping]
  );

  return (
    <div className="space-y-4">
      {dxfCount > 0 && (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LayoutGrid className="h-4 w-4 text-primary" />
            DXF armatür katmanı — {dxfCount} konum bulundu
          </div>
          <p className="text-xs text-muted-foreground">
            Bu konumlara hangi armatür tipini yerleştirelim?
          </p>
          <Select
            value={dxfType}
            onChange={(e) => setDxfType(e.target.value as FixtureKey)}
            className="h-9 text-xs"
          >
            {FIXTURE_LIST.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name} — {f.lumens} lm
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={() => {
              const n = placeFixturesFromDxf(dxfType);
              success(
                "DXF'ten armatür yerleştirildi",
                `${n} adet ${FIXTURE_TYPES[dxfType].name}`
              );
            }}
          >
            <LayoutGrid className="h-4 w-4" />
            {dxfCount} konuma yerleştir
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Veya bir armatür tipi seçip plan üzerine tıklayarak elle yerleştirin.
        Tavan yüksekliğine ({room?.wallHeight ?? 2.7} m) monte edilir.
      </p>

      <div className="space-y-2">
        {FIXTURE_LIST.map((f) => {
          const active = selectedKey === f.key;
          return (
            <button
              key={f.key}
              onClick={() => onSelectKey(active ? null : f.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
                active
                  ? "border-primary bg-primary/10"
                  : "hover:bg-accent"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md",
                  active ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {f.lumens} lm · {f.cct}K · {f.beamAngle}°
                </p>
              </div>
              {active && <Plus className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Yerleştirilen ({fixtures.length})</span>
        </div>
        {fixtures.length === 0 ? (
          <p className="text-xs text-muted-foreground">Henüz armatür yok.</p>
        ) : (
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {fixtures.map((fx, i) => (
              <div
                key={fx.id}
                className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
              >
                <span className="flex-1 truncate">
                  #{i + 1} {FIXTURE_TYPES[fx.typeKey].name} (
                  {fx.position.x.toFixed(1)}, {fx.position.y.toFixed(1)})
                </span>
                <button
                  onClick={() => removeFixture(fx.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {fixtures.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => fixtures.forEach((f) => removeFixture(f.id))}
        >
          Tümünü temizle
        </Button>
      )}
    </div>
  );
}
