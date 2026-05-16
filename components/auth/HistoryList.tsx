"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  FolderOpen,
  Trash2,
  History as HistoryIcon,
  ArrowLeft,
} from "lucide-react";
import type { SimulationRecord } from "@/types";
import { useProjectStore } from "@/stores/projectStore";
import { useSimulationStore } from "@/stores/simulationStore";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";

export function HistoryList() {
  const router = useRouter();
  const { user } = useAuth();
  const loadShared = useProjectStore((s) => s.loadShared);
  const setResult = useSimulationStore((s) => s.setResult);
  const clearSim = useSimulationStore((s) => s.clear);

  const [rows, setRows] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeAll, setScopeAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = user?.role === "super_admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        isAdmin && scopeAll
          ? "/api/simulations?scope=all"
          : "/api/simulations";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setRows(data.simulations);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, scopeAll]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (rec: SimulationRecord) => {
    const p = rec.project;
    if (!p.room) return;
    clearSim();
    loadShared(p.room, p.fixtures, p.location, p.settings);
    if (p.result) setResult(p.result);
    router.push("/studio");
  };

  const remove = async (id: string) => {
    if (!confirm("Bu kayıt silinsin mi?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/simulations/${id}`, { method: "DELETE" });
      if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Simülasyon Geçmişi</h1>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              size="sm"
              variant={scopeAll ? "default" : "outline"}
              onClick={() => setScopeAll((v) => !v)}
            >
              {scopeAll ? "Tüm kullanıcılar" : "Sadece benimkiler"}
            </Button>
          )}
          <Link href="/studio">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Stüdyo
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Henüz kayıtlı simülasyon yok. Stüdyoda &quot;Hesapla&quot;
          dediğinizde sonuç otomatik buraya kaydedilir.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {r.summary.fileName ?? "İsimsiz proje"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString("tr-TR")}
                  {scopeAll && r.userEmail && ` · ${r.userEmail}`}
                </p>
              </div>
              <div className="flex gap-4 text-xs tabular-nums text-muted-foreground">
                <span>
                  Ort.{" "}
                  <b className="text-foreground">{fmt(r.summary.avg)}</b> lx
                </span>
                <span>
                  Min/Max {fmt(r.summary.min)}/{fmt(r.summary.max)}
                </span>
                <span>Uo {r.summary.uniformityUo.toFixed(2)}</span>
                <span>DF {r.summary.daylightFactorPct.toFixed(1)}%</span>
                <span>{r.summary.area.toFixed(1)} m²</span>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={() => open(r)}
                >
                  <FolderOpen className="h-3.5 w-3.5" /> Aç
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-destructive"
                  disabled={busyId === r.id}
                  onClick={() => remove(r.id)}
                >
                  {busyId === r.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
