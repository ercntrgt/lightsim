"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
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
  Map as MapIcon,
  Box as BoxIcon,
  Grid2x2,
  ChevronLeft,
  ChevronRight,
  History as HistoryIcon,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useSimulationStore } from "@/stores/simulationStore";
import { useProjectStore } from "@/stores/projectStore";
import { useAuth } from "@/components/auth/AuthProvider";
import { parseDxf } from "@/lib/dxf/parser";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DxfUploader } from "@/components/dxf/DxfUploader";
import { DxfViewer2D } from "@/components/dxf/DxfViewer2D";
import { LayerMapper } from "@/components/dxf/LayerMapper";
import { MaterialEditor } from "@/components/simulation/MaterialEditor";
import { FixtureLibrary } from "@/components/simulation/FixtureLibrary";
import { SolarPanel } from "@/components/simulation/SolarPanel";
import { ResultsPanel } from "@/components/simulation/ResultsPanel";
import type { FixtureKey, Point2D } from "@/types";

const Scene3D = dynamic(() => import("@/components/scene/Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      3D sahne yükleniyor…
    </div>
  ),
});
const HeatmapChart = dynamic(
  () => import("@/components/simulation/HeatmapChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Heatmap yükleniyor…
      </div>
    ),
  }
);

type ViewMode = "plan" | "3d" | "heatmap";

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
  const addFixture = useProjectStore((s) => s.addFixture);
  const roomParams = useProjectStore((s) => s.roomParams);
  const result = useSimulationStore((s) => s.result);
  const clearSim = useSimulationStore((s) => s.clear);
  const { user, logout } = useAuth();

  const [step, setStep] = useState<StepId>("upload");
  const [sampleTried, setSampleTried] = useState(false);
  const [fixtureKey, setFixtureKey] = useState<FixtureKey | null>(null);
  const [view, setView] = useState<ViewMode>("plan");

  const placeFixture = useCallback(
    (w: Point2D) => {
      if (!fixtureKey) return;
      addFixture({
        id: `fx${Math.random().toString(36).slice(2, 8)}`,
        typeKey: fixtureKey,
        position: { x: w.x, y: w.y, z: roomParams.wallHeight },
        rotationDeg: 0,
      });
    },
    [fixtureKey, addFixture, roomParams.wallHeight]
  );

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

  // Sonuç gelince 3D görünüme geç (heatmap düzlemi görünür).
  useEffect(() => {
    if (result) setView(room ? "3d" : "heatmap");
  }, [result, room]);

  // Yeniden yüklemede DXF yok ama oda kalıcıysa 2D yerine 3D'yi seç.
  useEffect(() => {
    if (!dxf && room && view === "plan") setView("3d");
  }, [dxf, room, view]);

  const stepDone = useCallback(
    (id: StepId): boolean => {
      if (id === "upload") return !!dxf;
      if (id === "layers") return !!room;
      return false;
    },
    [dxf, room]
  );

  const stepIdx = STEPS.findIndex((x) => x.id === step);
  const goPrev = () => stepIdx > 0 && setStep(STEPS[stepIdx - 1].id);
  const goNext = () =>
    stepIdx < STEPS.length - 1 && setStep(STEPS[stepIdx + 1].id);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Üst bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Yörünge"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="font-bold tracking-tight">
              Light<span className="text-primary">Sim</span>
            </span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {fileName ?? "Proje yok"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => {
              reset();
              clearSim();
              setStep("upload");
              setView("plan");
              setSampleTried(true);
            }}
          >
            <RotateCcw className="h-4 w-4" /> Sıfırla
          </Button>
          <Link href="/history">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <HistoryIcon className="h-4 w-4" /> Geçmiş
            </Button>
          </Link>
          {user?.role === "super_admin" && (
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Yönetim
              </Button>
            </Link>
          )}
          {user && (
            <div className="flex items-center gap-2 border-l pl-2">
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-xs font-medium">{user.email}</p>
                <p className="text-[10px] text-muted-foreground">
                  {user.status === "active"
                    ? user.role === "super_admin"
                      ? "Süper Admin"
                      : "Üye"
                    : user.status === "pending"
                      ? "Onay bekliyor"
                      : "Pasif"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Çıkış</span>
              </Button>
            </div>
          )}
        </div>
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

        {/* Merkez: 2D / 3D / heatmap */}
        <main className="flex min-w-0 flex-1 flex-col bg-background p-4">
          {(dxf || room) && (
            <div className="mb-3 flex shrink-0 gap-1.5">
              {(
                [
                  { id: "plan", label: "2D Plan", icon: MapIcon, on: !!dxf },
                  { id: "3d", label: "3D", icon: BoxIcon, on: !!room },
                  {
                    id: "heatmap",
                    label: "Heatmap",
                    icon: Grid2x2,
                    on: !!result,
                  },
                ] as const
              ).map((v) => (
                <Button
                  key={v.id}
                  size="sm"
                  variant={view === v.id ? "default" : "outline"}
                  disabled={!v.on}
                  className="gap-1.5"
                  onClick={() => setView(v.id as ViewMode)}
                >
                  <v.icon className="h-3.5 w-3.5" />
                  {v.label}
                </Button>
              ))}
            </div>
          )}
          <div className="min-h-0 flex-1">
            {!dxf && !room ? (
              <div className="flex h-full items-center justify-center">
                <div className="w-full max-w-xl">
                  <DxfUploader />
                </div>
              </div>
            ) : view === "heatmap" && result ? (
              <div className="h-full rounded-lg border bg-card p-2">
                <HeatmapChart result={result} />
              </div>
            ) : view === "3d" && room ? (
              <Scene3D />
            ) : dxf ? (
              <DxfViewer2D
                allowEdit={step === "layers" || step === "room"}
                onPlace={
                  step === "fixtures" && fixtureKey
                    ? placeFixture
                    : undefined
                }
              />
            ) : (
              // DXF yeniden yüklenmedi ama oda kalıcı — 3D göster.
              <Scene3D />
            )}
          </div>
        </main>

        {/* Sağ panel */}
        <aside className="flex w-80 shrink-0 flex-col border-l bg-card">
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
          {step === "room" && (
            <>
              <h2 className="mb-3 font-semibold">3 · Oda & Malzeme</h2>
              <MaterialEditor />
            </>
          )}
          {step === "location" && (
            <>
              <h2 className="mb-3 font-semibold">4 · Konum & Zaman</h2>
              <SolarPanel />
            </>
          )}
          {step === "fixtures" && (
            <>
              <h2 className="mb-3 font-semibold">5 · Armatürler</h2>
              <FixtureLibrary
                selectedKey={fixtureKey}
                onSelectKey={setFixtureKey}
              />
            </>
          )}
          {step === "results" && (
            <>
              <h2 className="mb-3 font-semibold">6 · Sonuçlar</h2>
              <ResultsPanel />
            </>
          )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-card p-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={stepIdx === 0}
              onClick={goPrev}
            >
              <ChevronLeft className="h-4 w-4" /> Geri
            </Button>
            {stepIdx < STEPS.length - 1 && (
              <Button size="sm" className="gap-1.5" onClick={goNext}>
                İleri <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
