"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Check,
  X,
  Trash2,
  UserPlus,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import type { PublicUser, UserStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGE: Record<UserStatus, { label: string; variant: string }> = {
  pending: { label: "Onay bekliyor", variant: "warning" },
  active: { label: "Aktif", variant: "success" },
  rejected: { label: "Reddedildi", variant: "destructive" },
};

export function AdminPanel() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Yeni kullanıcı formu
  const [nf, setNf] = useState({ name: "", email: "", password: "" });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: UserStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Kullanıcı silinsin mi? Geçmiş simülasyonları da silinir."))
      return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Silinemedi");
    } finally {
      setBusyId(null);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nf),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNf({ name: "", email: "", password: "" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  const pending = users.filter((u) => u.status === "pending");
  const others = users.filter((u) => u.status !== "pending");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Üyelik Yönetimi</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/history">
            <Button variant="outline" size="sm">
              Tüm geçmiş
            </Button>
          </Link>
          <Link href="/studio">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Stüdyo
            </Button>
          </Link>
        </div>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <form
        onSubmit={createUser}
        className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <Input
          placeholder="Ad Soyad"
          required
          value={nf.name}
          onChange={(e) => setNf({ ...nf, name: e.target.value })}
        />
        <Input
          type="email"
          placeholder="E-posta"
          required
          value={nf.email}
          onChange={(e) => setNf({ ...nf, email: e.target.value })}
        />
        <Input
          type="text"
          placeholder="Şifre (min 8)"
          required
          minLength={8}
          value={nf.password}
          onChange={(e) => setNf({ ...nf, password: e.target.value })}
        />
        <Button type="submit" disabled={creating} className="gap-1.5">
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Ekle (onaylı)
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-700">
                Onay bekleyenler ({pending.length})
              </h2>
              {pending.map((u) => (
                <Row
                  key={u.id}
                  u={u}
                  busy={busyId === u.id}
                  onApprove={() => setStatus(u.id, "active")}
                  onReject={() => setStatus(u.id, "rejected")}
                  onDelete={() => remove(u.id)}
                />
              ))}
            </section>
          )}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Tüm kullanıcılar ({others.length})
            </h2>
            {others.map((u) => (
              <Row
                key={u.id}
                u={u}
                busy={busyId === u.id}
                onApprove={() => setStatus(u.id, "active")}
                onReject={() => setStatus(u.id, "rejected")}
                onDelete={() => remove(u.id)}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function Row({
  u,
  busy,
  onApprove,
  onReject,
  onDelete,
}: {
  u: PublicUser;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const sb = STATUS_BADGE[u.status];
  const isAdmin = u.role === "super_admin";
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {u.name}{" "}
          {isAdmin && (
            <span className="ml-1 text-xs text-primary">★ süper admin</span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Badge variant={sb.variant as any}>{sb.label}</Badge>
      {!isAdmin && (
        <div className="flex shrink-0 gap-1">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              {u.status !== "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-emerald-700"
                  onClick={onApprove}
                >
                  <Check className="h-3.5 w-3.5" /> Onayla
                </Button>
              )}
              {u.status !== "rejected" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-amber-700"
                  onClick={onReject}
                >
                  <X className="h-3.5 w-3.5" /> Reddet
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
