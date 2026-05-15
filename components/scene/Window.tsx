"use client";

import type { WindowOpening } from "@/types";

/** Duvar üzerinde saydam cam paneli (delik açmak yerine bindirme — sağlam). */
export function Window({ win }: { win: WindowOpening }) {
  const dx = win.end.x - win.start.x;
  const dy = win.end.y - win.start.y;
  const width = Math.hypot(dx, dy);
  if (width < 1e-3) return null;
  const angle = Math.atan2(-dy, dx);
  const cx = (win.start.x + win.end.x) / 2;
  const cy = (win.start.y + win.end.y) / 2;
  const h = Math.max(0.1, win.headHeight - win.sillHeight);
  const cz = win.sillHeight + h / 2;

  return (
    <mesh position={[cx, cz, -cy]} rotation={[0, angle, 0]}>
      <boxGeometry args={[width, h, 0.04]} />
      <meshStandardMaterial
        color="#7dd3fc"
        transparent
        opacity={0.35}
        emissive="#bae6fd"
        emissiveIntensity={0.25}
      />
    </mesh>
  );
}
