"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Room as RoomT } from "@/types";

/** Plan (x,y,z_height) → Three (x, height, -y). */
export const toThree = (x: number, y: number, h = 0): [number, number, number] => [
  x,
  h,
  -y,
];

export function Room({ room }: { room: RoomT }) {
  // Zemin: oda dış çizgisinden ShapeGeometry.
  const floorGeo = useMemo(() => {
    const shape = new THREE.Shape();
    room.outline.forEach((p, i) =>
      i === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)
    );
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2); // XY → XZ
    return g;
  }, [room.outline]);

  const wallRefl = room.material.wall;
  const floorRefl = room.material.floor;

  return (
    <group>
      {/* Zemin */}
      <mesh geometry={floorGeo} receiveShadow position={[0, 0, 0]}>
        <meshStandardMaterial
          color={new THREE.Color().setScalar(0.25 + floorRefl * 0.5)}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Duvarlar — her segment bir kutu */}
      {room.walls.map((w) => {
        const dx = w.end.x - w.start.x;
        const dy = w.end.y - w.start.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-3) return null;
        const angle = Math.atan2(-dy, dx); // three Z = -y
        const cx = (w.start.x + w.end.x) / 2;
        const cy = (w.start.y + w.end.y) / 2;
        return (
          <mesh
            key={w.id}
            position={[cx, w.height / 2, -cy]}
            rotation={[0, angle, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[len, w.height, w.thickness]} />
            <meshStandardMaterial
              color={new THREE.Color().setScalar(0.35 + wallRefl * 0.5)}
              transparent
              opacity={0.55}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
