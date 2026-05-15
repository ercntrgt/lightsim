import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "LightSim — DXF Aydınlatma & Günışığı Simülasyonu",
  description:
    "DXF planlarını tarayıcıda yükleyin; lümen yöntemi ve günışığı faktörü ile lüks haritası ve 3D simülasyon üretin. Vercel'e deploy edilebilir.",
  keywords: [
    "aydınlatma simülasyonu",
    "günışığı",
    "DXF",
    "lümen yöntemi",
    "daylight factor",
    "DIALux alternatifi",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
