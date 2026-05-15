"use client";

import { useRef } from "react";
import * as THREE from "three";
import type { Fixture as FixtureT } from "@/types";
import { FIXTURE_TYPES } from "@/lib/lighting/fixtures";

export function Fixture({ fixture }: { fixture: FixtureT }) {
  const t = FIXTURE_TYPES[fixture.typeKey];
  const { x, y, z } = fixture.position;
  const target = useRef<THREE.Object3D>(null);
  // lümen → kabaca three ışık yoğunluğu (görsel amaçlı)
  const intensity = Math.min(8, t.lumens / 700);

  return (
    <group position={[x, z, -y]}>
      {/* Armatür gövdesi */}
      <mesh>
        <boxGeometry args={[0.4, 0.06, 0.4]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#fbbf24"
          emissiveIntensity={0.6}
        />
      </mesh>
      <object3D ref={target} position={[0, -1, 0]} />
      {t.ldc === "spot" ? (
        <spotLight
          castShadow
          intensity={intensity}
          angle={(t.beamAngle * Math.PI) / 180 / 2}
          penumbra={0.3}
          distance={12}
          target={target.current ?? undefined}
        />
      ) : (
        <pointLight
          castShadow
          intensity={intensity}
          distance={14}
          decay={2}
        />
      )}
    </group>
  );
}
