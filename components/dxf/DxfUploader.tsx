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
  const [dwgHint, setDwgHint] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setDwgHint(false);
      try {
        // İkili (binary) DWG dosyaları "AC10xx" sürüm imzasıyla başlar
        // (R13–2018). DXF metni hiçbir zaman böyle başlamaz — yanlışlıkla
        // .dwg adıyla kaydedilmiş gerçek DXF'leri yine de açabilelim diye
        // uzantıya değil dosya başlığına bakıyoruz.
        const head = new Uint8Array(await file.slice(0, 6).arrayBuffer());
        let magic = "";
        for (let i = 0; i < head.length; i++)
          magic += String.fromCharCode(head[i]);
        if (/^AC10\d\d$/.test(magic) || /^MC0\.0/.test(magic)) {
          setDwgHint(true);
          error(
            "DWG doğrudan açılamıyor",
            "Bu gerçek bir ikili DWG. CAD'de DXF'e çevirip yükleyin."
          );
          return;
        }
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
          "Dosya okunamadı",
          e instanceof Error ? e.message : "Geçerli bir DXF değil"
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
    accept: {
      "image/vnd.dxf": [".dxf"],
      "application/dxf": [".dxf"],
      "image/vnd.dwg": [".dwg"],
      "application/acad": [".dwg"],
    },
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
          ? "Dosya işleniyor…"
          : isDragActive
            ? "Dosyayı bırakın"
            : "DXF dosyasını buraya sürükleyin veya tıklayın"}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileWarning className="h-3.5 w-3.5" />
        DXF (veya DXF içerikli .dwg) · dosya tarayıcıda işlenir, sunucuya
        yüklenmez.
      </p>
      {dwgHint && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-4 w-full max-w-md rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-900"
        >
          <p className="font-semibold">
            DWG ikili (binary) bir formattır — gizlilik için dosyalar
            tarayıcıdan çıkmadığından doğrudan açılamaz.
          </p>
          <p className="mt-1.5">Tek seferlik dönüştürme:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>
              AutoCAD / BricsCAD: <b>Farklı Kaydet → AutoCAD DXF (*.dxf)</b>
            </li>
            <li>
              Ücretsiz: <b>ODA File Converter</b>, <b>LibreCAD</b> veya{" "}
              <b>QCAD</b> ile DWG → DXF
            </li>
          </ul>
          <p className="mt-1.5">Ardından oluşan .dxf dosyasını yükleyin.</p>
        </div>
      )}
    </div>
  );
}
