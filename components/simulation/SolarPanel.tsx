"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Sun, Moon, Compass, Search, Loader2, MapPin } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { solarPosition } from "@/lib/solar/position";
import { clearSkyHorizontalLux } from "@/lib/solar/irradiance";
import { useToast } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { fmt } from "@/lib/utils";

interface GeoHit {
  display_name: string;
  lat: string;
  lon: string;
}

const LocationMap = dynamic(
  () => import("@/components/simulation/LocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
        Harita yükleniyor…
      </div>
    ),
  }
);

const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(
    min % 60
  ).padStart(2, "0")}`;

export function SolarPanel() {
  const location = useProjectStore((s) => s.location);
  const setLocation = useProjectStore((s) => s.setLocation);
  const { error } = useToast();

  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    const query = q.trim();
    if (query.length < 2) return;
    setSearching(true);
    setHits([]);
    try {
      const res = await fetch("/api/geocode?q=" + encodeURIComponent(query));
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          (data && data.error) || "Arama servisi yanıt vermedi"
        );
      const list = data as GeoHit[];
      if (list.length === 0) error("Sonuç yok", `"${query}" bulunamadı`);
      setHits(list);
    } catch (e) {
      error("Konum araması başarısız", e instanceof Error ? e.message : "");
    } finally {
      setSearching(false);
    }
  };

  const pick = (h: GeoHit) => {
    const short = h.display_name.split(",").slice(0, 2).join(",").trim();
    setLocation({
      lat: +parseFloat(h.lat).toFixed(4),
      lng: +parseFloat(h.lon).toFixed(4),
      label: short,
    });
    setHits([]);
    setQ(short);
  };

  const sun = useMemo(() => solarPosition(location), [location]);
  const clearLux = useMemo(
    () => clearSkyHorizontalLux(location),
    [location]
  );
  const isDay = sun.altitudeDeg > 0;

  return (
    <div className="space-y-4">
      {/* Konum arama */}
      <div className="relative space-y-1.5">
        <Label>Konum ara</Label>
        <div className="flex gap-2">
          <Input
            value={q}
            placeholder="Şehir, ilçe veya adres…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="h-9"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-9 shrink-0 px-3"
            disabled={searching}
            onClick={search}
            aria-label="Ara"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {hits.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
            {hits.map((h, i) => (
              <button
                key={i}
                onClick={() => pick(h)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-accent"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="line-clamp-2">{h.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-52 overflow-hidden rounded-lg border">
        <LocationMap
          lat={location.lat}
          lng={location.lng}
          onPick={(lat, lng) =>
            setLocation({
              lat: +lat.toFixed(4),
              lng: +lng.toFixed(4),
              label: `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
            })
          }
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Haritaya tıklayarak konum seçin · {location.label} (
        {location.lat}, {location.lng})
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="date">Tarih</Label>
          <Input
            id="date"
            type="date"
            value={location.date}
            onChange={(e) => setLocation({ date: e.target.value })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label>Gök modeli</Label>
          <Select
            value={location.skyModel}
            onChange={(e) =>
              setLocation({
                skyModel: e.target.value as "clear" | "overcast",
              })
            }
            className="h-9"
          >
            <option value="clear">Açık (ASHRAE)</option>
            <option value="overcast">Kapalı (CIE Overcast)</option>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <Label>Saat</Label>
          <span className="font-mono text-muted-foreground">
            {hhmm(location.timeMinutes)}
          </span>
        </div>
        <Slider
          value={location.timeMinutes}
          min={0}
          max={1439}
          step={15}
          onValueChange={(v) => setLocation({ timeMinutes: v })}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <Label className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" /> Bina kuzeyi
          </Label>
          <span className="font-mono text-muted-foreground">
            {location.buildingNorthDeg}°
          </span>
        </div>
        <Slider
          value={location.buildingNorthDeg}
          min={0}
          max={359}
          step={1}
          onValueChange={(v) => setLocation({ buildingNorthDeg: v })}
        />
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
        <div className="flex items-center gap-2 font-medium">
          {isDay ? (
            <Sun className="h-4 w-4 text-amber-500" />
          ) : (
            <Moon className="h-4 w-4 text-slate-400" />
          )}
          Güneş: {sun.altitudeDeg.toFixed(1)}° yükseklik /{" "}
          {sun.azimuthDeg.toFixed(0)}° azimut
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {isDay
            ? `ASHRAE açık gök global yatay ≈ ${fmt(clearLux)} lx`
            : "Güneş ufkun altında — günışığı katkısı yok."}
        </p>
      </div>
    </div>
  );
}
