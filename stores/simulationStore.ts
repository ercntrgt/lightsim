"use client";

import { create } from "zustand";
import type { SimulationResult } from "@/types";

type SimStatus = "idle" | "running" | "done" | "error";

interface SimStore {
  status: SimStatus;
  progress: number; // 0..1
  result: SimulationResult | null;
  error: string | null;
  start: () => void;
  setProgress: (n: number) => void;
  setResult: (r: SimulationResult) => void;
  fail: (msg: string) => void;
  clear: () => void;
}

export const useSimulationStore = create<SimStore>((set) => ({
  status: "idle",
  progress: 0,
  result: null,
  error: null,
  start: () => set({ status: "running", progress: 0, error: null }),
  setProgress: (n) => set({ progress: n }),
  setResult: (r) => set({ status: "done", progress: 1, result: r }),
  fail: (msg) => set({ status: "error", error: msg }),
  clear: () =>
    set({ status: "idle", progress: 0, result: null, error: null }),
}));
