"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { decodeShare } from "@/lib/share";
import { useProjectStore } from "@/stores/projectStore";
import { useSimulationStore } from "@/stores/simulationStore";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";

const Scene3D = dynamic(() => import("@/components/scene/Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      3D sahne yükleniyor…
    </div>
  ),
});

export function SharedView() {
  const params = useSearchParams();
  const loadShared = useProjectStore((s) => s.loadShared);
  const setResult = useSimulationStore((s) => s.setResult);
  const result = useSimulationStore((s) => s.result);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const d = params.get("d");
    if (!d) {
      setErr("Paylaşım verisi yok (d parametresi eksik).");
      return;
    }
    try {
      const p = decodeShare(d);
      if (!p.room) throw new Error("Proje odası boş.");
      loadShared(p.room, p.fixtures, p.location, p.settings);
      if (p.result) setResult(p.result);
      setName(p.fileName);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Çözümlenemedi");
    }
  }, [params, loadShared, setResult]);

  if (err)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="max-w-md text-muted-foreground">{err}</p>
        <Link href="/studio">
          <Button variant="outline">Yeni proje başlat</Button>
        </Link>
      </div>
    );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Image
              src="/logo.png"
              alt="Yörünge"
              width={36}
              height={36}
              className="object-contain"
            />
            Light<span className="text-primary">Sim</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            Paylaşılan: {name ?? "proje"} (salt görüntüleme)
          </span>
        </div>
        <Link href="/studio">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Kendi projeni başlat
          </Button>
        </Link>
      </header>
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 p-4">
          <Scene3D />
        </main>
        <aside className="w-72 shrink-0 space-y-3 overflow-y-auto border-l bg-card p-4">
          <h2 className="font-semibold">Sonuçlar</h2>
          {result ? (
            <div className="space-y-2 text-sm">
              <Row label="Ortalama" value={`${fmt(result.avg)} lx`} />
              <Row
                label="Min / Max"
                value={`${fmt(result.min)} / ${fmt(result.max)} lx`}
              />
              <Row label="Uo" value={result.uniformityUo.toFixed(2)} />
              <Row
                label="Daylight Factor"
                value={`% ${result.daylightFactorPct.toFixed(1)}`}
              />
              <Row
                label="Lümen yöntemi"
                value={`${fmt(result.lumenMethodAvg)} lx`}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Bu paylaşımda hesap sonucu yok.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Sonuçlar tahminîdir. EN 12464-1 / CIE / ASHRAE referanslıdır.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded-md border bg-background px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
