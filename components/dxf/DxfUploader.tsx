"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2, FileWarning } from "lucide-react";
import { parseDxf } from "@/lib/dxf/parser";
import { useProjectStore } from "@/stores/projectStore";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function DxfUploader() {
  const setDxf = useProjectStore((s) => s.setDxf);
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const text = await file.text();
        const t0 = performance.now();
        const { doc, warnings } = parseDxf(text);
        setDxf(file.name, doc);
        const ms = Math.round(performance.now() - t0);
        success(
          "DXF yüklendi",
          `${doc.entities.length} eleman, ${doc.layers.length} katman · ${ms} ms`
        );
        warnings.forEach((w) => error("Uyarı", w));
      } catch (e) {
        error(
          "DXF okunamadı",
          e instanceof Error ? e.message : "Bilinmeyen hata"
        );
      } finally {
        setBusy(false);
      }
    },
    [setDxf, success, error]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) handleFile(accepted[0]);
    },
    [handleFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/vnd.dxf": [".dxf"], "application/dxf": [".dxf"] },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/60 hover:bg-accent/40"
      )}
    >
      <input {...getInputProps()} />
      {busy ? (
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      ) : (
        <UploadCloud className="h-10 w-10 text-primary" />
      )}
      <p className="mt-4 font-medium">
        {busy
          ? "DXF parse ediliyor…"
          : isDragActive
            ? "Dosyayı bırakın"
            : "DXF dosyasını buraya sürükleyin veya tıklayın"}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileWarning className="h-3.5 w-3.5" />
        Dosya tarayıcıda işlenir, sunucuya yüklenmez.
      </p>
    </div>
  );
}
