"use client";

import type { Door as DoorT } from "@/types";

/** Duvar üzerinde kapı kanadı — zeminden door.height'a kadar dolu panel. */
export function Door({ door }: { door: DoorT }) {
  const dx = door.end.x - door.start.x;
  const dy = door.end.y - door.start.y;
  const width = Math.hypot(dx, dy);
  if (width < 1e-3) return null;
  const angle = Math.atan2(-dy, dx);
  const cx = (door.start.x + door.end.x) / 2;
  const cy = (door.start.y + door.end.y) / 2;
  const h = Math.max(0.1, door.height);

  return (
    <mesh position={[cx, h / 2, -cy]} rotation={[0, angle, 0]} castShadow>
      <boxGeometry args={[width, h, 0.05]} />
      <meshStandardMaterial
        color="#a16207"
        roughness={0.7}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}
