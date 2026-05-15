"use client";

import { Suspense } from "react";
import { StudioShell } from "@/components/studio/StudioShell";

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-muted-foreground">
          Stüdyo yükleniyor…
        </div>
      }
    >
      <StudioShell />
    </Suspense>
  );
}
