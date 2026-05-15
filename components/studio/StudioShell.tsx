"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  Layers,
  Home,
  MapPin,
  Lightbulb,
  BarChart3,
  RotateCcw,
  Check,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { parseDxf } from "@/lib/dxf/parser";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DxfUploader } from "@/components/dxf/DxfUploader";
import { DxfViewer2D } from "@/components/dxf/DxfViewer2D";
import { LayerMapper } from "@/components/dxf/LayerMapper";

const STEPS = [
  { id: "upload", label: "DXF Yükle", icon: Upload },
  { id: "layers", label: "Katman Eşleme", icon: Layers },
  { id: "room", label: "Oda & Malzeme", icon: Home },
  { id: "location", label: "Konum & Zaman", icon: MapPin },
  { id: "fixtures", label: "Armatürler", icon: Lightbulb },
  { id: "results", label: "Sonuçlar", icon: BarChart3 },
] as const;
type StepId = (typeof STEPS)[number]["id"];

export function StudioShell() {
  const params = useSearchParams();
  const { success, error } = useToast();
  const dxf = useProjectStore((s) => s.dxf);
  const room = useProjectStore((s) => s.room);
  const fileName = useProjectStore((s) => s.fileName);
  const setDxf = useProjectStore((s) => s.setDxf);
  const reset = useProjectStore((s) => s.reset);

  const [step, setStep] = useState<StepId>("upload");
  const [sampleTried, setSampleTried] = useState(false);

  // Örnek proje query parametresi.
  useEffect(() => {
    const sample = params.get("sample");
    if (!sample || dxf || sampleTried) return;
    setSampleTried(true);
    (async () => {
      try {
        const res = await fetch(`/samples/${sample}.dxf`);
        if (!res.ok) throw new Error("Örnek dosya bulunamadı");
        const { doc, warnings } = parseDxf(await res.text());
        setDxf(`${sample}.dxf`, doc);
        success("Örnek proje yüklendi", `${sample}.dxf`);
        warnings.forEach((w) => error("Uyarı", w));
        setStep("layers");
      } catch (e) {
        error("Örnek yüklenemedi", e instanceof Error ? e.message : "");
      }
    })();
  }, [params, dxf, sampleTried, setDxf, success, error]);

  // DXF gelince otomatik katman adımına geç.
  useEffect(() => {
    if (dxf && step === "upload") setStep("layers");
  }, [dxf, step]);

  const stepDone = useCallback(
    (id: StepId): boolean => {
      if (id === "upload") return !!dxf;
      if (id === "layers") return !!room;
      return false;
    },
    [dxf, room]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Üst bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold tracking-tight">
            Light<span className="text-primary">Sim</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {fileName ?? "Proje yok"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => {
            reset();
            setStep("upload");
            setSampleTried(true);
          }}
        >
          <RotateCcw className="h-4 w-4" /> Sıfırla
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Stepper */}
        <nav className="flex w-56 shrink-0 flex-col gap-1 border-r bg-muted/30 p-3">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = stepDone(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                    active
                      ? "bg-primary-foreground/20"
                      : done
                        ? "bg-emerald-600 text-white"
                        : "bg-muted-foreground/15"
                  )}
                >
                  {done && !active ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <s.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Merkez: 2D plan */}
        <main className="min-w-0 flex-1 bg-background p-4">
          {dxf ? (
            <DxfViewer2D />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-xl">
                <DxfUploader />
              </div>
            </div>
          )}
        </main>

        {/* Sağ panel */}
        <aside className="w-80 shrink-0 overflow-y-auto border-l bg-card p-4">
          {step === "upload" && (
            <div className="space-y-3">
              <h2 className="font-semibold">1 · DXF Yükle</h2>
              <p className="text-sm text-muted-foreground">
                Mimari planı sürükleyin. Duvar, pencere ve kapı katmanları
                otomatik tanınır; dosya tarayıcıdan çıkmaz.
              </p>
              {!dxf && <DxfUploader />}
            </div>
          )}
          {step === "layers" && (
            <>
              <h2 className="mb-3 font-semibold">2 · Katman Eşleme</h2>
              <LayerMapper />
            </>
          )}
          {(step === "room" ||
            step === "location" ||
            step === "fixtures" ||
            step === "results") && (
            <div className="space-y-2">
              <h2 className="font-semibold">
                {STEPS.find((s) => s.id === step)?.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                Bu adım sonraki sürümde etkinleşecek.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
