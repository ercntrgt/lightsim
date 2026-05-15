"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { viridis } from "@/lib/viz/colormap";
import type { SimulationResult } from "@/types";

/** Hesap ızgarasını çalışma düzleminde renkli (viridis) bir doku olarak gösterir. */
export function HeatmapPlane({
  result,
  workplaneHeight,
}: {
  result: SimulationResult;
  workplaneHeight: number;
}) {
  const { texture, width, height, cx, cy } = useMemo(() => {
    const { cols, rows, spacing, origin, grid } = result;
    const maxLux = Math.max(1e-6, result.max);
    const data = new Uint8Array(cols * rows * 4); // RGBA, başlangıçta şeffaf
    for (const g of grid) {
      const ci = Math.round((g.x - origin.x - spacing / 2) / spacing);
      const ri = Math.round((g.y - origin.y - spacing / 2) / spacing);
      if (ci < 0 || ci >= cols || ri < 0 || ri >= rows) continue;
      const idx = (ri * cols + ci) * 4;
      const [r, gr, b] = viridis(g.lux / maxLux);
      data[idx] = r;
      data[idx + 1] = gr;
      data[idx + 2] = b;
      data[idx + 3] = 235;
    }
    const tex = new THREE.DataTexture(data, cols, rows, THREE.RGBAFormat);
    tex.flipY = true;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return {
      texture: tex,
      width: cols * spacing,
      height: rows * spacing,
      cx: origin.x + (cols * spacing) / 2,
      cy: origin.y + (rows * spacing) / 2,
    };
  }, [result]);

  return (
    <mesh
      position={[cx, workplaneHeight + 0.02, -cy]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
