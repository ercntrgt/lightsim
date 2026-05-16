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
import { LandingAuthButtons } from "@/components/auth/LandingAuthButtons";
import { LightAtmosphere } from "@/components/landing/LightAtmosphere";
import { Reveal } from "@/components/landing/Reveal";

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
              width={52}
              height={52}
              priority
              className="object-contain"
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
          <LandingAuthButtons />
        </div>
      </header>

      {/* Hero — "Karanlıktan Aydınlığa" reveal */}
      <section className="ls-stage relative isolate overflow-hidden border-b border-white/10">
        <LightAtmosphere />
        <div className="container mx-auto flex flex-col items-center px-4 py-28 text-center sm:py-32">
          <Image
            src="/logo.png"
            alt="Yörünge"
            width={156}
            height={156}
            priority
            className="ls-reveal mb-6 object-contain drop-shadow-[0_0_28px_rgba(251,191,36,0.28)]"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="ls-reveal mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-slate-200 backdrop-blur-sm"
            style={{ animationDelay: "0.3s" }}
          >
            <Sun className="h-4 w-4 text-primary" />
            DIALux / Relux&apos;un basit, tarayıcı tabanlı alternatifi
          </span>
          <h1
            className="ls-reveal max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl"
            style={{ animationDelay: "0.45s" }}
          >
            DXF tabanlı{" "}
            <span className="text-primary">aydınlatma & günışığı</span>{" "}
            simülasyonu
          </h1>
          <p
            className="ls-reveal mt-6 max-w-2xl text-lg text-slate-300"
            style={{ animationDelay: "0.62s" }}
          >
            Mimari planı yükle, duvar ve pencereleri otomatik tanı, armatür
            yerleştir; lüks haritası ve 3D sonuçları tarayıcıda anında al.
            Ağır hesaplar Web Worker&apos;da — UI hiç kilitlenmez.
          </p>
          <div
            className="ls-reveal mt-10 flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "0.8s" }}
          >
            <Link href="/studio">
              <Button size="lg" className="gap-2">
                DXF Yükle ve Başla <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/studio?sample=office-25m2">
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Örnek projeyi aç (25 m² ofis)
              </Button>
            </Link>
          </div>
          <div
            className="ls-reveal mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-400"
            style={{ animationDelay: "0.98s" }}
          >
            {[
              "EN 12464-1",
              "CIE Overcast Sky",
              "ASHRAE Clear Sky",
              "Veriler tarayıcıda işlenir",
            ].map((t, i) => (
              <span key={t} className="flex items-center gap-5">
                {i > 0 && <span className="text-slate-600">•</span>}
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.07} hover>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Nasıl çalışır */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <Reveal>
            <h2 className="mb-3 text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Üç adımda sonuç
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
              Kurulum yok, hesap açmak yok, dosya yüklemesi yok. Plan
              tarayıcıdan çıkmadan saniyeler içinde sonuç.
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                n: "1",
                t: "DXF planını yükle",
                d: "Mimari planı sürükle-bırak. Duvar, pencere ve kapı katmanları otomatik tanınır; dosya cihazından çıkmaz.",
              },
              {
                n: "2",
                t: "Eşle, oda & armatür ayarla",
                d: "Katman checklist'i ile duvar/pencere/kapıyı doğrula, malzeme yansıtıcılığını ve konum/zamanı seç, armatürleri yerleştir.",
              },
              {
                n: "3",
                t: "Hesapla → heatmap, 3D, PDF",
                d: "Web Worker hesabı yaparken UI akıcı kalır. Lüks haritası, 3D sahne ve çok sayfalı PDF rapor anında hazır.",
              },
            ].map((step, i) => (
              <Reveal
                key={step.n}
                delay={i * 0.1}
                className="relative rounded-xl border bg-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {step.n}
                </div>
                <h3 className="mb-2 font-semibold">{step.t}</h3>
                <p className="text-sm text-muted-foreground">{step.d}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <Link href="/studio">
              <Button size="lg" className="gap-2">
                Hemen başla <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* İletişim */}
      <section id="iletisim" className="border-t bg-background">
        <div className="container mx-auto px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
            İletişim
          </h2>
          <Reveal className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-center sm:gap-10">
              <Image
                src="/logo.png"
                alt="Yörünge Kurumsal Danışmanlık Eğitim Limited Şirketi"
                width={170}
                height={170}
                className="shrink-0 object-contain drop-shadow-md"
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
          </Reveal>
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
