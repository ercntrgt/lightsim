"use client";

import { Suspense } from "react";
import { SharedView } from "@/components/studio/SharedView";

// /studio/s?d=<base64url> — paylaşılan projeyi salt görüntüleme.
export default function SharedProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-muted-foreground">
          Paylaşılan proje yükleniyor…
        </div>
      }
    >
      <SharedView />
    </Suspense>
  );
}
