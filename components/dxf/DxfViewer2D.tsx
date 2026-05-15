"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSimulationStore } from "@/stores/simulationStore";
import { viridisCss } from "@/lib/viz/colormap";
import type { ElementType, Point2D } from "@/types";

const COLORS: Record<ElementType, string> = {
  wall: "#1e293b",
  window: "#0ea5e9",
  door: "#b45309",
  ignore: "#cbd5e1",
};

interface Props {
  /** Verilirse tıklama dünya koordinatını (m) callback'e iletir (armatür yerleştirme). */
  onPlace?: (world: Point2D) => void;
  showFixtures?: boolean;
  /** Sonuç ızgarası (heatmap 2D önizleme) — opsiyonel. */
  className?: string;
}

export function DxfViewer2D({ onPlace, showFixtures = true, className }: Props) {
  const dxf = useProjectStore((s) => s.dxf);
  const mapping = useProjectStore((s) => s.layerMapping);
  const room = useProjectStore((s) => s.room);
  const fixtures = useProjectStore((s) => s.fixtures);
  const result = useSimulationStore((s) => s.result);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const view = useRef({ scale: 1, ox: 0, oy: 0, fitted: false });
  const drag = useRef<{ x: number; y: number; on: boolean }>({
    x: 0,
    y: 0,
    on: false,
  });

  // Konteyner boyutunu izle.
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize({ w: Math.max(320, width), h: Math.max(320, height) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!dxf) return;
    const { min, max } = dxf.bbox;
    const w = Math.max(0.001, max.x - min.x);
    const h = Math.max(0.001, max.y - min.y);
    const pad = 0.92;
    const s = Math.min((size.w / w) * pad, (size.h / h) * pad);
    view.current.scale = s;
    view.current.ox = (size.w - w * s) / 2 - min.x * s;
    view.current.oy = (size.h + h * s) / 2 + min.y * s; // y ekseni ters
    view.current.fitted = true;
  }, [dxf, size]);

  const toScreen = (p: Point2D) => ({
    x: p.x * view.current.scale + view.current.ox,
    y: -p.y * view.current.scale + view.current.oy,
  });
  const toWorld = (sx: number, sy: number): Point2D => ({
    x: (sx - view.current.ox) / view.current.scale,
    y: -(sy - view.current.oy) / view.current.scale,
  });

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = size.w * dpr;
    cv.height = size.h * dpr;
    cv.style.width = `${size.w}px`;
    cv.style.height = `${size.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, size.w, size.h);

    if (!dxf) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DXF bekleniyor…", size.w / 2, size.h / 2);
      return;
    }
    if (!view.current.fitted) fit();

    // Oda dış çizgisi dolgusu.
    if (room && room.outline.length > 2) {
      ctx.beginPath();
      room.outline.forEach((p, i) => {
        const s = toScreen(p);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
      ctx.fill();
    }

    // Lüks heatmap (simülasyon sonucu varsa).
    if (result && result.grid.length) {
      const maxLux = Math.max(1e-6, result.max);
      const cell = result.spacing * view.current.scale;
      for (const g of result.grid) {
        const s = toScreen({ x: g.x, y: g.y });
        ctx.fillStyle = viridisCss(g.lux / maxLux);
        ctx.globalAlpha = 0.72;
        ctx.fillRect(
          s.x - cell / 2,
          s.y - cell / 2,
          cell + 0.5,
          cell + 0.5
        );
      }
      ctx.globalAlpha = 1;
    }

    // Entity'ler.
    for (const e of dxf.entities) {
      const type: ElementType = mapping[e.layer] ?? "ignore";
      ctx.strokeStyle = COLORS[type];
      ctx.lineWidth = type === "wall" ? 2.5 : type === "ignore" ? 1 : 2;
      ctx.beginPath();
      e.points.forEach((p, i) => {
        const s = toScreen(p);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      if (e.closed) ctx.closePath();
      ctx.stroke();
    }

    // Armatürler.
    if (showFixtures && fixtures.length) {
      for (const f of fixtures) {
        const s = toScreen(f.position);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Ölçek çubuğu (1 m).
    const onePx = view.current.scale;
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, size.h - 20);
    ctx.lineTo(16 + onePx, size.h - 20);
    ctx.stroke();
    ctx.fillStyle = "#334155";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("1 m", 16, size.h - 26);
  }, [dxf, mapping, room, fixtures, result, size, showFixtures, fit]);

  useEffect(() => {
    view.current.fitted = false;
    draw();
  }, [dxf, draw]);
  useEffect(() => draw(), [draw]);

  // Etkileşim.
  const onWheel = (ev: React.WheelEvent) => {
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const before = toWorld(mx, my);
    view.current.scale *= factor;
    view.current.ox = mx - before.x * view.current.scale;
    view.current.oy = my + before.y * view.current.scale;
    draw();
  };
  const onDown = (ev: React.MouseEvent) => {
    drag.current = { x: ev.clientX, y: ev.clientY, on: true };
  };
  const onMove = (ev: React.MouseEvent) => {
    if (!drag.current.on) return;
    view.current.ox += ev.clientX - drag.current.x;
    view.current.oy += ev.clientY - drag.current.y;
    drag.current.x = ev.clientX;
    drag.current.y = ev.clientY;
    draw();
  };
  const onUp = (ev: React.MouseEvent) => {
    const moved =
      Math.abs(ev.clientX - drag.current.x) +
      Math.abs(ev.clientY - drag.current.y);
    drag.current.on = false;
    if (onPlace && moved < 4) {
      const rect = canvasRef.current!.getBoundingClientRect();
      onPlace(toWorld(ev.clientX - rect.left, ev.clientY - rect.top));
    }
  };

  return (
    <div
      ref={wrapRef}
      className={className ?? "relative h-full w-full overflow-hidden rounded-lg border"}
    >
      <canvas
        ref={canvasRef}
        onWheel={onWheel}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={() => (drag.current.on = false)}
        className={onPlace ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}
      />
    </div>
  );
}
