"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProjectStore } from "@/stores/projectStore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

// Yapay üst/alt kapaklar kaldırıldı; yalnızca hesabı/geometriyi bozacak
// fiziksel sınırlar tutuluyor: oranlar 0..1, uzunluklar pozitif.
const schema = z.object({
  wallHeight: z.coerce.number().min(0.5),
  wallThickness: z.coerce.number().min(0.01),
  sillHeight: z.coerce.number().min(0),
  glassTransmittance: z.coerce.number().min(0.01).max(1),
  doorHeight: z.coerce.number().min(0.1),
  workplaneHeight: z.coerce.number().min(0),
  maintenanceFactor: z.coerce.number().min(0.05).max(1),
  ceiling: z.coerce.number().min(0).max(1),
  wall: z.coerce.number().min(0).max(1),
  floor: z.coerce.number().min(0).max(1),
});
type FormVals = z.infer<typeof schema>;

export function MaterialEditor() {
  const roomParams = useProjectStore((s) => s.roomParams);
  const setRoomParams = useProjectStore((s) => s.setRoomParams);
  const room = useProjectStore((s) => s.room);

  const { register, watch, setValue, formState } = useForm<FormVals>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      wallHeight: roomParams.wallHeight,
      wallThickness: roomParams.wallThickness,
      sillHeight: roomParams.sillHeight,
      glassTransmittance: roomParams.glassTransmittance,
      doorHeight: roomParams.doorHeight,
      workplaneHeight: roomParams.workplaneHeight,
      maintenanceFactor: roomParams.maintenanceFactor,
      ceiling: roomParams.material.ceiling,
      wall: roomParams.material.wall,
      floor: roomParams.material.floor,
    },
  });

  // Geçerli değişiklikleri store'a aktar.
  useEffect(() => {
    const sub = watch((v) => {
      const parsed = schema.safeParse(v);
      if (!parsed.success) return;
      const d = parsed.data;
      setRoomParams({
        wallHeight: d.wallHeight,
        wallThickness: d.wallThickness,
        sillHeight: d.sillHeight,
        glassTransmittance: d.glassTransmittance,
        doorHeight: d.doorHeight,
        workplaneHeight: d.workplaneHeight,
        maintenanceFactor: d.maintenanceFactor,
        material: { ceiling: d.ceiling, wall: d.wall, floor: d.floor },
      });
    });
    return () => sub.unsubscribe();
  }, [watch, setRoomParams]);

  const num = (
    name: keyof FormVals,
    label: string,
    step = 0.05,
    unit?: string
  ) => (
    <div className="space-y-1">
      <Label htmlFor={name}>
        {label} {unit && <span className="text-muted-foreground">({unit})</span>}
      </Label>
      <Input
        id={name}
        type="number"
        step={step}
        {...register(name)}
        className="h-9"
      />
      {formState.errors[name] && (
        <p className="text-xs text-destructive">Geçersiz değer</p>
      )}
    </div>
  );

  const refl = (name: "ceiling" | "wall" | "floor", label: string) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <Label>{label} yansıtıcılığı</Label>
        <span className="font-mono text-muted-foreground">
          {watch(name)?.toFixed(2)}
        </span>
      </div>
      <Slider
        value={Number(watch(name) ?? 0)}
        min={0}
        max={1}
        step={0.05}
        onValueChange={(v) =>
          setValue(name, v, { shouldValidate: true })
        }
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {!room && (
        <p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-700">
          Önce katman eşlemeden &quot;Odayı oluştur&quot; deyin.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {num("wallHeight", "Duvar yüks.", 0.1, "m")}
        {num("wallThickness", "Duvar kalınl.", 0.05, "m")}
        {num("sillHeight", "Parapet", 0.05, "m")}
        {num("doorHeight", "Kapı yüks.", 0.05, "m")}
        {num("glassTransmittance", "Cam τ", 0.05)}
        {num("workplaneHeight", "Çalışma düzl.", 0.05, "m")}
        {num("maintenanceFactor", "Bakım fak. (MF)", 0.05)}
      </div>
      <p className="rounded-md bg-sky-500/10 p-2 text-xs text-sky-700">
        Cam yüksekliği parapetten tavana otomatik hesaplanır:{" "}
        <b>
          {Math.max(
            0,
            Number(watch("wallHeight") ?? 0) -
              Number(watch("sillHeight") ?? 0)
          ).toFixed(2)}{" "}
          m
        </b>{" "}
        (duvar yüks. − parapet). Parapeti değiştirince cam yüksekliği
        kendiliğinden güncellenir.
      </p>
      <div className="space-y-3 rounded-lg border p-3">
        {refl("ceiling", "Tavan")}
        {refl("wall", "Duvar")}
        {refl("floor", "Zemin")}
      </div>
      <p className="text-xs text-muted-foreground">
        EN 12464-1 tipik değerler: tavan 0.70, duvar 0.50, zemin 0.20, MF 0.80.
      </p>
    </div>
  );
}
