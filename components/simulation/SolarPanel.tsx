"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Sun, Moon, Compass } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { solarPosition } from "@/lib/solar/position";
import { clearSkyHorizontalLux } from "@/lib/solar/irradiance";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { fmt } from "@/lib/utils";

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

  const sun = useMemo(() => solarPosition(location), [location]);
  const clearLux = useMemo(
    () => clearSkyHorizontalLux(location),
    [location]
  );
  const isDay = sun.altitudeDeg > 0;

  return (
    <div className="space-y-4">
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
