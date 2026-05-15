# LightSim — DXF Tabanlı Aydınlatma & Günışığı Simülasyon Web Uygulaması

> Bu prompt, Vercel'e deploy edilecek bir Next.js uygulamasını sıfırdan oluşturmak için tasarlanmıştır. Claude, Cursor, v0.dev, Bolt veya benzeri bir AI kod aracına olduğu gibi verilebilir.

---

## 🎯 Proje Özeti

DXF dosyalarını (mimari planları) tarayıcıda yükleyip, içlerindeki **duvar, pencere, kapı** geometrilerini otomatik tanıyan; ardından **yapay aydınlatma (lümen yöntemi)** ve **günışığı (daylight factor + güneş konumu)** simülasyonu yapan, sonuçları **lüks haritası (heatmap)** ve **3D görselleştirme** olarak sunan, **Vercel'e deploy edilebilir** bir web uygulaması geliştir.

Mimari ofisler, iç mimarlar ve aydınlatma tasarımcıları için DIALux/Relux'un basitleştirilmiş, tarayıcı tabanlı bir alternatifi olacak.

---

## 🧱 Teknoloji Yığını (zorunlu)

- **Framework:** Next.js 14+ (App Router) + TypeScript
- **Deployment:** Vercel (zero-config)
- **Stil:** Tailwind CSS + shadcn/ui
- **3D:** Three.js + @react-three/fiber + @react-three/drei
- **DXF Parsing:** `dxf-parser` (npm) — istemci tarafında çalışır
- **2D Görselleştirme:** Konva.js veya HTML5 Canvas
- **Grafik/Heatmap:** Plotly.js veya D3.js
- **Güneş konumu:** `suncalc` npm paketi
- **State:** Zustand
- **Form:** react-hook-form + zod
- **PDF Rapor:** `@react-pdf/renderer`
- **Dosya yükleme:** `react-dropzone`

**Vercel uyumluluğu kuralları:**
- Tüm ağır hesaplamalar **istemci tarafında (Web Worker)** yapılmalı — serverless fonksiyon zaman limitlerini (10 sn Hobby, 60 sn Pro) aşmamak için.
- API route'lar yalnızca rapor üretimi, paylaşım linki ve opsiyonel kullanıcı kaydı için kullanılmalı.
- Uzun süren ray tracing işlemleri **Web Worker + Comlink** ile arkaplanda çalışmalı, ana thread'i kilitlememeli.
- DXF dosyaları doğrudan tarayıcıda parse edilmeli (sunucuya yüklenmemeli) — gizlilik ve performans için.

---

## 📂 Proje Yapısı

```
lightsim/
├── app/
│   ├── page.tsx                    # Landing
│   ├── studio/
│   │   ├── page.tsx                # Ana çalışma alanı
│   │   └── [projectId]/page.tsx    # Paylaşılan proje görüntüleme
│   ├── api/
│   │   ├── report/route.ts         # PDF rapor üretimi
│   │   └── share/route.ts          # Paylaşım linki
│   └── layout.tsx
├── components/
│   ├── dxf/
│   │   ├── DxfUploader.tsx
│   │   ├── DxfViewer2D.tsx         # 2D plan
│   │   └── LayerMapper.tsx         # Katman → eleman eşleme
│   ├── scene/
│   │   ├── Scene3D.tsx             # Three.js sahnesi
│   │   ├── Room.tsx                # Oda mesh'i
│   │   ├── Window.tsx              # Pencere
│   │   ├── Fixture.tsx             # Armatür
│   │   └── HeatmapPlane.tsx        # Lüks heatmap zemini
│   ├── simulation/
│   │   ├── SolarPanel.tsx          # Tarih/saat/konum/oryantasyon
│   │   ├── FixtureLibrary.tsx      # Armatür kütüphanesi
│   │   ├── MaterialEditor.tsx      # Yüzey yansıtıcılığı
│   │   └── ResultsPanel.tsx        # Min/avg/max lüks, uniformity
│   └── ui/                         # shadcn bileşenleri
├── lib/
│   ├── dxf/
│   │   ├── parser.ts               # dxf-parser wrapper
│   │   ├── classifier.ts           # Katman/blok → duvar/pencere/kapı
│   │   └── extruder.ts             # 2D → 3D yükseltme
│   ├── solar/
│   │   ├── position.ts             # suncalc wrapper
│   │   └── irradiance.ts           # Direkt + diffuse + reflected
│   ├── lighting/
│   │   ├── lumenMethod.ts          # Yapay aydınlatma
│   │   ├── daylightFactor.ts       # Günışığı katsayısı
│   │   ├── raytracer.ts            # Basit ray tracer (Web Worker)
│   │   └── ies.ts                  # IES dosya parser (opsiyonel)
│   ├── grid/
│   │   └── calculationGrid.ts      # Hesap noktaları ızgarası
│   └── workers/
│       └── simulation.worker.ts    # Comlink worker
├── stores/
│   ├── projectStore.ts             # Zustand
│   └── simulationStore.ts
└── types/
    └── index.ts                    # Wall, Window, Fixture, Room...
```

---

## 🧩 Modül Detayları

### 1. DXF Okuma Modülü (`lib/dxf/`)

**parser.ts** — `dxf-parser` ile dosyayı parse et, AutoCAD entity'lerini (LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE, INSERT, 3DFACE) JS objelerine çevir.

**classifier.ts** — Kullanıcı katman eşlemesi yapar:
- Otomatik tahmin: katman ismi `wall`, `duvar`, `A-WALL` içeriyorsa → duvar
- `window`, `pencere`, `A-GLAZ` → pencere
- `door`, `kapi`, `A-DOOR` → kapı
- Kullanıcı `LayerMapper` bileşeniyle elle düzeltebilmeli.

**extruder.ts** — 2D çizgileri verilen yükseklikle 3D mesh'e yükseltir. Pencereler duvar üzerinde delik (CSG) oluşturur. **three-bvh-csg** veya basit boolean kullan.

### 2. Solar Modülü (`lib/solar/`)

- Enlem/boylam/tarih/saat → güneş azimut & yükseklik açısı (suncalc)
- ASHRAE Clear Sky veya Perez modeli ile direkt normal & diffuse horizontal irradiance
- CIE Overcast Sky modeli daylight factor için
- Bina kuzey yönü (orientation) parametresi

### 3. Aydınlatma Hesabı (`lib/lighting/`)

**lumenMethod.ts** — Klasik lümen yöntemi:
```
E_avg = (N × Φ_lamp × CU × MF) / (A_room)
```
- CU (Coefficient of Utilization): oda indeksi + yüzey yansıtıcılığından tablo lookup
- MF (Maintenance Factor): kullanıcı girdisi (varsayılan 0.8)

**daylightFactor.ts** — BRE Split-Flux formülü:
```
DF = (SC + ERC + IRC) × M × θ / 2
```
- SC: Sky Component
- ERC: External Reflected Component
- IRC: Internal Reflected Component

**raytracer.ts** — Web Worker'da çalışan basit ray tracer:
- Her hesap ızgarası noktasından gökyüzü yarım küresine N örnek ışın (önerilen N=200-1000)
- BVH ile hızlandırılmış mesh kesişimi (three-mesh-bvh)
- Pencere geometrisinden geçen ışınlar gökyüzü luminance ile çarpılır
- 2 sıçramaya kadar diffuse interreflection

### 4. Hesap Izgarası (`lib/grid/`)

- Zemin düzleminde 0.25–0.5 m aralıklı nokta ızgarası
- Her nokta için aydınlık seviyesi (lüks) hesaplanır
- Avg, min, max, uniformity (min/avg ve min/max) raporu

### 5. 3D Sahne (`components/scene/`)

- React Three Fiber sahnesi: oda, pencereler (saydam), armatürler (point/spot light)
- HeatmapPlane: hesap ızgarasını renkli düzlem olarak göster (jet/viridis colormap)
- Iso-lüks eğrileri (kontur çizgileri)
- Güneş ışını oku ve gölge önizleme
- OrbitControls, GizmoHelper, Stats

### 6. Armatür Kütüphanesi (`components/simulation/FixtureLibrary.tsx`)

Hazır armatürler:
- LED panel 60×60 (4000 lm, 4000K)
- Downlight 18W (1800 lm)
- Linear LED 1200mm (3600 lm)
- Spot 35W halojen eşdeğeri (450 lm)

Her armatürün:
- Lümen, renk sıcaklığı, ışık dağılım açısı (LDC basit cosine veya IES)
- Drag-and-drop ile plan üzerine yerleştirme

### 7. Sonuçlar & Rapor (`components/simulation/ResultsPanel.tsx`)

Gösterilen metrikler:
- **Avg illuminance** (lüks)
- **Min/Max illuminance**
- **Uniformity** (Uo = E_min / E_avg, EN 12464-1)
- **Daylight Factor** (%)
- **Daylight Autonomy** (yıllık simülasyonda)
- **EN 12464-1 referansı** (ofis: 500 lx, koridor: 100 lx vb.)

PDF rapor: kapak + plan + heatmap + tablo + tavsiyeler.

---

## 🎨 Kullanıcı Akışı

1. **Karşılama (`/`):** "DXF Yükle ve Başla" CTA, örnek proje linkleri
2. **DXF Yükleme:** Drag-drop → tarayıcıda parse → 2D önizleme
3. **Katman Eşleme:** Otomatik tahmin + manuel düzeltme arayüzü
4. **Oda Parametreleri:** Duvar yüksekliği, parapet, yansıtıcılıklar (tavan 0.7, duvar 0.5, zemin 0.2)
5. **Konum & Zaman:** Harita seçici (Leaflet), tarih/saat slider'ı, bina kuzeyi
6. **Armatür Yerleştirme:** Kütüphaneden seç, plan üzerine bırak
7. **Simülasyon:** "Hesapla" butonu → Web Worker'da ilerleme çubuğu
8. **Sonuçlar:** 3D sahnede heatmap + sayısal panel
9. **Rapor:** PDF indir veya paylaşım linki üret

---

## ✅ Kabul Kriterleri (MVP)

- [ ] Bir DXF dosyası (duvar + pencere katmanlı) yüklendiğinde 5 saniye içinde 2D plan görüntülenir
- [ ] Katman eşleme otomatik %80+ doğrulukla çalışır
- [ ] 50 m² bir oda için lümen yöntemi 1 saniyenin altında sonuç verir
- [ ] Daylight factor hesabı (ray tracing, 500 örnek) 10 saniyenin altında biter
- [ ] Heatmap 3D sahnede gerçek zamanlı render edilir (60 fps hedef)
- [ ] PDF rapor indirilebilir
- [ ] Vercel'e `git push` ile sorunsuz deploy olur
- [ ] Lighthouse Performance skoru 80+

---

## 🚀 Vercel Deploy Talimatları

1. Projeyi GitHub'a push et
2. Vercel'de "Import Project" → GitHub repo'su seç
3. Framework Preset: **Next.js** (otomatik)
4. Build Command: `next build`
5. Environment Variables (opsiyonel):
   - `NEXT_PUBLIC_MAPBOX_TOKEN` (harita için)
6. Deploy → custom domain ekle

---

## 📦 Başlangıç Komutları

```bash
npx create-next-app@latest lightsim --typescript --tailwind --app
cd lightsim
npm install three @react-three/fiber @react-three/drei
npm install dxf-parser suncalc zustand zod react-hook-form
npm install plotly.js react-plotly.js
npm install @react-pdf/renderer react-dropzone
npm install three-mesh-bvh three-bvh-csg
npm install comlink
npm install zustand
npx shadcn-ui@latest init
```

---

## 🎁 Bonus Özellikler (v2)

- IES dosyası import (gerçek armatür fotometrisi)
- Yıllık daylight autonomy (saatlik 8760 simülasyon)
- LEED v4 / WELL Building Standard uyumluluk kontrolü
- Glare analizi (DGP - Daylight Glare Probability)
- Çoklu kat (multi-storey) desteği
- Gerçek zamanlı işbirliği (Liveblocks / Yjs)
- AI öneri sistemi: "Bu odada 4 panel yerine 6 yerleştirsen uniformity 0.4'ten 0.6'ya çıkar"

---

## 📜 Lisans & Notlar

- MIT lisansı
- Aydınlatma hesaplamaları **tahmini**dir; resmi projeler için DIALux/Relux/Radiance ile doğrulama gerekir
- EN 12464-1 ve CIE referansları rapor altında belirtilmeli

---

**Başla:** Yukarıdaki yapıyı kurarak `app/page.tsx` ve `app/studio/page.tsx` ile MVP'yi oluştur. İlk iterasyonda yalnızca **DXF yükleme + 2D görüntüleme + lümen yöntemi + heatmap**'i tamamla. Diğer modülleri sonraki iterasyonlara bırak.
