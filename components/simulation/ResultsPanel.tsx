"use client";

import { useState } from "react";
import { Play, Loader2, Activity, Download, Share2 } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useSimulationStore } from "@/stores/simulationStore";
import { runSimulationInWorker } from "@/lib/workers/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { fmt } from "@/lib/utils";
import { EN_TARGETS, MIN_UNIFORMITY } from "@/lib/lighting/standards";
import { encodeShare } from "@/lib/share";
import { renderResultPng } from "@/lib/viz/heatmapPng";
import {
  deriveModeResult,
  hasContribution,
  type ReportMode,
} from "@/lib/lighting/modeResult";

function Metric({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ResultsPanel() {
  const { error, success } = useToast();
  const { user } = useAuth();
  const canAnalyze = user?.status === "active";
  const room = useProjectStore((s) => s.room);
  const fixtures = useProjectStore((s) => s.fixtures);
  const location = useProjectStore((s) => s.location);
  const settings = useProjectStore((s) => s.settings);
  const setSettings = useProjectStore((s) => s.setSettings);
  const fileName = useProjectStore((s) => s.fileName);

  const status = useSimulationStore((s) => s.status);
  const progress = useSimulationStore((s) => s.progress);
  const result = useSimulationStore((s) => s.result);
  const start = useSimulationStore((s) => s.start);
  const setProgress = useSimulationStore((s) => s.setProgress);
  const setResult = useSimulationStore((s) => s.setResult);
  const fail = useSimulationStore((s) => s.fail);

  const [target, setTarget] = useState("office");
  const [busy, setBusy] = useState<
    "pdf-artificial" | "pdf-daylight" | "share" | null
  >(null);

  const saveHistory = async (r: typeof result) => {
    if (!room || !r) return;
    try {
      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          room,
          fixtures,
          location,
          settings,
          result: r,
        }),
      });
      if (res.ok) success("Geçmişe kaydedildi");
    } catch {
      /* geçmiş kaydı başarısız — simülasyon yine de gösterilir */
    }
  };

  const calculate = async () => {
    if (!canAnalyze)
      return error(
        "Yetki yok",
        user
          ? "Üyeliğiniz onay bekliyor — analiz yapamazsınız."
          : "Analiz için giriş yapın."
      );
    if (!room) return error("Oda yok", "Önce odayı oluşturun.");
    if (fixtures.length === 0 && !settings.includeDaylight)
      return error("Kaynak yok", "Armatür ekleyin veya günışığını açın.");
    start();
    try {
      const r = await runSimulationInWorker(
        { room, fixtures, location, settings },
        (f) => setProgress(f)
      );
      setResult(r);
      saveHistory(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Hesaplama hatası";
      fail(msg);
      error("Simülasyon başarısız", msg);
    }
  };

  const running = status === "running";
  const tgt = EN_TARGETS[target];
  const avgPass = result ? result.avg >= tgt.lux : false;
  const uoPass = result ? result.uniformityUo >= MIN_UNIFORMITY : false;

  // Yapay / günışığı için ayrı, kendi içinde özerk PDF.
  const downloadPdf = async (mode: Exclude<ReportMode, "combined">) => {
    if (!room || !result) return;
    setBusy(mode === "artificial" ? "pdf-artificial" : "pdf-daylight");
    try {
      const modeResult = deriveModeResult(result, mode);
      const image = renderResultPng(room, modeResult);
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          room,
          location,
          result: modeResult,
          targetKey: target,
          image,
          mode,
        }),
      });
      if (!res.ok) throw new Error("Rapor üretilemedi");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const tag = mode === "artificial" ? "yapay-aydinlatma" : "gunisigi";
      a.download = `lightsim-${tag}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      success(
        mode === "artificial"
          ? "Yapay aydınlatma PDF indirildi"
          : "Günışığı PDF indirildi"
      );
    } catch (e) {
      error("PDF hatası", e instanceof Error ? e.message : "");
    } finally {
      setBusy(null);
    }
  };

  const sharePromise = async () => {
    if (!room || !result) return;
    setBusy("share");
    try {
      const d = encodeShare({
        fileName,
        room,
        fixtures,
        location,
        settings,
        result,
      });
      const link = `${window.location.origin}/studio/s?d=${d}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      success("Paylaşım linki kopyalandı", `${d.length} karakter`);
    } catch (e) {
      error("Paylaşım hatası", e instanceof Error ? e.message : "");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Gelişmiş ayarlar</p>
        <label className="flex items-center justify-between text-sm">
          <span>Yapay aydınlatma</span>
          <input
            type="checkbox"
            checked={settings.includeArtificial}
            onChange={(e) =>
              setSettings({ includeArtificial: e.target.checked })
            }
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>Günışığı (ray tracing)</span>
          <input
            type="checkbox"
            checked={settings.includeDaylight}
            onChange={(e) =>
              setSettings({ includeDaylight: e.target.checked })
            }
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
        </label>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Izgara aralığı</span>
            <span className="font-mono text-muted-foreground">
              {settings.gridSpacing.toFixed(2)} m
            </span>
          </div>
          <Slider
            value={settings.gridSpacing}
            min={0.25}
            max={0.5}
            step={0.05}
            onValueChange={(v) => setSettings({ gridSpacing: v })}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Gök ışın örneği</span>
            <span className="font-mono text-muted-foreground">
              {settings.raySamples}
            </span>
          </div>
          <Slider
            value={settings.raySamples}
            min={200}
            max={1000}
            step={100}
            onValueChange={(v) => setSettings({ raySamples: v })}
          />
        </div>
      </div>

      {!canAnalyze && (
        <p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-700">
          {user
            ? "Üyeliğiniz süper admin onayı bekliyor. Onaylandıktan sonra analiz yapabilir ve sonuçlar geçmişinize kaydedilir."
            : "Analiz yapmak için giriş yapmalısınız."}
        </p>
      )}

      <Button
        onClick={calculate}
        disabled={running || !room || !canAnalyze}
        className="w-full gap-2"
        size="lg"
      >
        {running ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {running ? "Hesaplanıyor…" : "Hesapla"}
      </Button>

      {running && (
        <div className="space-y-1">
          <Progress value={progress * 100} />
          <p className="text-right text-xs text-muted-foreground">
            %{Math.round(progress * 100)}
          </p>
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Metric
              label="Ortalama"
              value={fmt(result.avg)}
              unit="lx"
              hint={`Lümen yönt.: ${fmt(result.lumenMethodAvg)} lx`}
            />
            <Metric label="Min / Max" value={`${fmt(result.min)} / ${fmt(result.max)}`} unit="lx" />
            <Metric
              label="Uniformity Uo"
              value={result.uniformityUo.toFixed(2)}
              hint="EN 12464-1: Uo ≥ 0.60"
            />
            <Metric
              label="Daylight Factor"
              value={result.daylightFactorPct.toFixed(1)}
              unit="%"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium">Mekân türü (EN 12464-1)</label>
            <Select value={target} onChange={(e) => setTarget(e.target.value)}>
              {Object.entries(EN_TARGETS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} — {v.lux} lx
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap gap-2">
              <Badge variant={avgPass ? "success" : "destructive"}>
                Aydınlık {avgPass ? "✓ uygun" : "✗ yetersiz"} (hedef {tgt.lux} lx)
              </Badge>
              <Badge variant={uoPass ? "success" : "warning"}>
                Uniformity {uoPass ? "✓" : "✗"} {result.uniformityUo.toFixed(2)}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Rapor — her biri kendi içinde özerk PDF
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={
                  busy !== null || !hasContribution(result, "artificial")
                }
                title={
                  hasContribution(result, "artificial")
                    ? "Yalnız armatür/yapay aydınlatma raporu"
                    : "Yapay aydınlatma katkısı yok"
                }
                onClick={() => downloadPdf("artificial")}
              >
                {busy === "pdf-artificial" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Yapay PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={
                  busy !== null || !hasContribution(result, "daylight")
                }
                title={
                  hasContribution(result, "daylight")
                    ? "Yalnız günışığı raporu"
                    : "Günışığı katkısı yok (pencere yok / kapalı)"
                }
                onClick={() => downloadPdf("daylight")}
              >
                {busy === "pdf-daylight" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Günışığı PDF
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              disabled={busy !== null}
              onClick={sharePromise}
            >
              {busy === "share" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              Paylaş
            </Button>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Activity className="h-3 w-3" />
            {result.grid.length} hesap noktası · {result.durationMs} ms · sonuç
            tahminîdir.
          </p>
        </>
      )}

      {!result && !running && (
        <p className="text-sm text-muted-foreground">
          Oda, malzeme ve armatürleri ayarladıktan sonra
          &quot;Hesapla&quot; deyin. Ağır hesap Web Worker&apos;da çalışır,
          arayüz kilitlenmez.
        </p>
      )}
    </div>
  );
}
