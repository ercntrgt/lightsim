import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Sun,
  Lightbulb,
  Grid3x3,
  FileText,
  Box,
  Upload,
  Phone,
  User,
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
      {/* Üst bar — logo */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Yörünge Kurumsal Danışmanlık Eğitim"
              width={44}
              height={44}
              priority
              className="rounded-md bg-white p-0.5"
            />
            <div className="leading-tight">
              <p className="font-bold tracking-tight">
                Light<span className="text-primary">Sim</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                by Yörünge Kurumsal Danışmanlık
              </p>
            </div>
          </div>
          <Link href="/studio">
            <Button size="sm" className="gap-2">
              Stüdyoya Git <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="container mx-auto flex flex-col items-center px-4 py-24 text-center">
          <Image
            src="/logo.png"
            alt="Yörünge"
            width={96}
            height={96}
            priority
            className="mb-6 rounded-xl bg-white p-1 shadow-sm"
          />
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

      {/* İletişim */}
      <section id="iletisim" className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
            İletişim
          </h2>
          <Card className="mx-auto max-w-3xl">
            <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-center sm:gap-10">
              <Image
                src="/logo.png"
                alt="Yörünge Kurumsal Danışmanlık Eğitim Limited Şirketi"
                width={140}
                height={140}
                className="shrink-0 rounded-xl bg-white p-2 shadow-sm"
              />
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <p className="text-lg font-semibold">
                  Yörünge Kurumsal Danışmanlık Eğitim Limited Şirketi
                </p>
                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center justify-center gap-2 sm:justify-start">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">Ercan TURGUT</span>
                  </p>
                  <p className="pl-6 text-muted-foreground">
                    Mekatronik Yüksek Mühendisi
                  </p>
                  <p className="flex items-center justify-center gap-2 sm:justify-start">
                    <Phone className="h-4 w-4 text-primary" />
                    <a
                      href="tel:+905320159816"
                      className="font-medium hover:underline"
                    >
                      0532 015 98 16
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer + haklar */}
      <footer className="mt-auto border-t bg-card">
        <div className="container mx-auto space-y-2 px-4 py-8 text-center text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            © {new Date().getFullYear()} Yörünge Kurumsal Danışmanlık Eğitim
            Limited Şirketi — Sistemin tüm hakları saklıdır.
          </p>
          <p>
            Aydınlatma hesaplamaları <strong>tahminîdir</strong>; resmi
            projeler için DIALux / Relux / Radiance ile doğrulama gerekir.
            Referanslar: EN 12464-1 (iç mekân aydınlatma) ve CIE Standart
            Overcast Sky / ASHRAE Clear Sky modelleri.
          </p>
          <p>Veriler tarayıcıda işlenir, sunucuya yüklenmez.</p>
        </div>
      </footer>
    </main>
  );
}
