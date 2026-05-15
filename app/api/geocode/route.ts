// Konum arama proxy'si — Nominatim'i sunucudan, politikasına uygun
// (tanımlayıcı User-Agent) çağırır. Tarayıcıdan doğrudan çağrı; Nominatim
// kullanım politikası engeli, CORS ve reklam/gizlilik engelleyicileri
// yüzünden güvenilmezdi. Aynı-origin /api/geocode bunların hepsini aşar.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2)
    return NextResponse.json({ error: "Sorgu çok kısa" }, { status: 400 });
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5" +
      "&accept-language=tr&q=" +
      encodeURIComponent(q);
    const r = await fetch(url, {
      headers: {
        // Nominatim politikası: uygulamayı tanımlayan gerçek bir User-Agent şart.
        "User-Agent":
          "LightSim/1.0 (https://lightsim.yesilsertifika.tech; ercangpt@gmail.com)",
        "Accept-Language": "tr",
      },
      // Nominatim'e yük bindirmemek için sonuçları 1 gün önbelleğe al.
      next: { revalidate: 86400 },
    });
    if (!r.ok)
      return NextResponse.json(
        { error: `Arama servisi yanıt vermedi (${r.status})` },
        { status: 502 }
      );
    const data = (await r.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;
    const hits = data.map((d) => ({
      display_name: d.display_name,
      lat: d.lat,
      lon: d.lon,
    }));
    return NextResponse.json(hits, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Geocode hatası" },
      { status: 500 }
    );
  }
}
