import Link from "next/link";
import {
  ArrowRight,
  Sun,
  Lightbulb,
  Grid3x3,
  FileText,
  Box,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Upload,
    title: "DXF Yükle",
    desc: "Mimari planı tarayıcıda parse et — dosya sunucuya gitmez.",
  },
  {
    icon: Lightbulb,
    title: "Lümen Yöntemi",
    desc: "Armatür kütüphanesi ile yapay aydınlatma hesabı (CU + MF).",
  },
  {
    icon: Sun,
    title: "Günışığı Faktörü",
    desc: "BRE split-flux + güneş konumu (suncalc) ve ray tracing.",
  },
  {
    icon: Grid3x3,
    title: "Lüks Heatmap",
    desc: "Hesap ızgarası, uniformity ve EN 12464-1 karşılaştırması.",
  },
  {
    icon: Box,
    title: "3D Görselleştirme",
    desc: "Three.js sahnede oda, pencere, armatür ve heatmap düzlemi.",
  },
  {
    icon: FileText,
    title: "PDF Rapor",
    desc: "Kapak + plan + heatmap + tablo + tavsiyeler, paylaşım linki.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="container mx-auto flex flex-col items-center px-4 py-24 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Sun className="h-4 w-4 text-primary" />
            DIALux / Relux&apos;un basit, tarayıcı tabanlı alternatifi
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            DXF tabanlı{" "}
            <span className="text-primary">aydınlatma & günışığı</span>{" "}
            simülasyonu
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Mimari planı yükle, duvar ve pencereleri otomatik tanı, armatür
            yerleştir; lüks haritası ve 3D sonuçları tarayıcıda anında al.
            Ağır hesaplar Web Worker&apos;da — UI hiç kilitlenmez.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/studio">
              <Button size="lg" className="gap-2">
                DXF Yükle ve Başla <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/studio?sample=office-25m2">
              <Button size="lg" variant="outline">
                Örnek projeyi aç (25 m² ofis)
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Disclaimer footer */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
          <p>
            Aydınlatma hesaplamaları <strong>tahminîdir</strong>; resmi
            projeler için DIALux / Relux / Radiance ile doğrulama gerekir.
            Referanslar: EN 12464-1 (iç mekân aydınlatma) ve CIE Standart
            Overcast Sky / ASHRAE Clear Sky modelleri.
          </p>
          <p className="mt-2">
            LightSim · MIT Lisansı · Veriler tarayıcıda işlenir, sunucuya
            yüklenmez.
          </p>
        </div>
      </footer>
    </main>
  );
}
