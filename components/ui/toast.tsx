"use client";

import * as React from "react";
import { create } from "zustand";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "info" | "success" | "error";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  kind: ToastKind;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => void;
  dismiss: (id: number) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
      5000
    );
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** Bileşenlerden bildirim göstermek için kısayollar. */
export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    toast: (title: string, description?: string) =>
      push({ title, description, kind: "info" }),
    success: (title: string, description?: string) =>
      push({ title, description, kind: "success" }),
    error: (title: string, description?: string) =>
      push({ title, description, kind: "error" }),
  };
}

const ICONS = {
  info: <Info className="h-5 w-5 text-blue-500" />,
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <AlertTriangle className="h-5 w-5 text-destructive" />,
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-4 shadow-lg"
          )}
        >
          <div className="mt-0.5">{ICONS[t.kind]}</div>
          <div className="flex-1">
            <p className="text-sm font-medium">{t.title}</p>
            {t.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.description}
              </p>
            )}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="opacity-60 hover:opacity-100"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
