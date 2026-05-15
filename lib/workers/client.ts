"use client";

// Worker'ı yalnızca tarayıcıda, çağrı anında örnekler (SSR'de Worker yok).

import * as Comlink from "comlink";
import type { SimWorkerApi } from "./simulation.worker";
import type { SimPayload } from "@/lib/lighting/simulate";
import type { SimulationResult } from "@/types";

export function runSimulationInWorker(
  payload: SimPayload,
  onProgress: (fraction: number) => void
): Promise<SimulationResult> {
  const worker = new Worker(
    new URL("./simulation.worker.ts", import.meta.url),
    { type: "module" }
  );
  const api = Comlink.wrap<SimWorkerApi>(worker);
  return api
    .run(payload, Comlink.proxy(onProgress))
    .then((result: SimulationResult) => {
      worker.terminate();
      return result;
    })
    .catch((err: unknown) => {
      worker.terminate();
      throw err;
    });
}
