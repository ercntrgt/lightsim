// Comlink worker — ağır simülasyon ana thread'i kilitlemeden burada çalışır.

import * as Comlink from "comlink";
import { runSimulation, type SimPayload } from "@/lib/lighting/simulate";

const api = {
  run(payload: SimPayload, onProgress: (f: number) => void) {
    return runSimulation(payload, (f) => {
      try {
        onProgress(f);
      } catch {
        /* proxy kapanmışsa yoksay */
      }
    });
  },
};

export type SimWorkerApi = typeof api;

Comlink.expose(api);
