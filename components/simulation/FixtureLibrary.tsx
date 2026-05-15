"use client";

import { Lightbulb, Trash2, Plus } from "lucide-react";
import { FIXTURE_LIST, FIXTURE_TYPES } from "@/lib/lighting/fixtures";
import { useProjectStore } from "@/stores/projectStore";
import type { FixtureKey } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Bir armatür seçip plan üzerine tıklayarak yerleştirin. Tavan
        yüksekliğine ({room?.wallHeight ?? 2.7} m) monte edilir.
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
          <p className="text-xs text-muted-foreground">
            Henüz armatür yok.
          </p>
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
