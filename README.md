# LightSim

DXF tabanlı **aydınlatma & günışığı simülasyon** web uygulaması — DIALux/Relux'un
basitleştirilmiş, tarayıcı tabanlı ve Vercel'e deploy edilebilir bir alternatifi.

DXF planını tarayıcıda yükle → duvar/pencere/kapı otomatik tanı → armatür yerleştir
→ **lümen yöntemi** + **günışığı faktörü (BRE split-flux)** + Web Worker ray tracer
→ **lüks heatmap** + **3D görselleştirme** + **PDF rapor / paylaşım linki**.

## Teknoloji

Next.js 14 (App Router) · TypeScript · Tailwind · Three.js + R3F + drei ·
three-mesh-bvh · dxf-parser · suncalc · Zustand · react-hook-form + zod ·
Plotly · @react-pdf/renderer · Comlink (Web Worker).

> **Vercel kuralı:** Tüm ağır hesaplar istemci tarafında Web Worker'da çalışır;
> DXF sunucuya yüklenmez (gizlilik + serverless zaman limiti). API route'lar
> yalnızca PDF rapor ve paylaşım linki içindir.

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # üretim derlemesi (SSR sızıntısı yoksa 0 hata)
npm run start    # üretim sunucusu
```

## Vercel Deploy

1. Repo'yu GitHub'a push et.
2. Vercel → **Import Project** → repo'yu seç.
3. Framework Preset: **Next.js** (otomatik), Build Command: `next build` (zero-config).
4. Ortam değişkenleri opsiyoneldir:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` — gerekmez (varsayılan OpenStreetMap karoları).
   - `KV_REST_API_URL` / `KV_REST_API_TOKEN` — opsiyonel; varsa paylaşım linkleri
     kısaltılır, yoksa proje durumu URL'ye gömülür (harici servis gerekmez).
5. Deploy → istenirse özel alan adı ekle.

> Yerel klasör adında Türkçe karakter olması Vercel'i etkilemez; Vercel yalnızca
> repo **içeriğini** kullanır, klasör adını değil.

## Doğruluk Notu

Hesaplamalar **tahminîdir**; resmi projelerde DIALux/Relux/Radiance ile doğrulayın.
Referanslar: **EN 12464-1**, **CIE Standart Overcast Sky**, **ASHRAE Clear Sky**.

## Lisans & Haklar

Sistemin **tüm hakları Yörünge Kurumsal Danışmanlık Eğitim Limited Şirketi'ne**
aittir (Tüm Hakları Saklıdır) — bkz. [LICENSE](./LICENSE).

**İletişim:** Ercan TURGUT · Mekatronik Yüksek Mühendisi · 0532 015 98 16

Orijinal şartname: `docs-spec/lighting-sim-prompt.md`.
