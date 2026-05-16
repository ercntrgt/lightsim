"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Bounds,
  Stats,
} from "@react-three/drei";
import { useProjectStore } from "@/stores/projectStore";
import { useSimulationStore } from "@/stores/simulationStore";
import { Room } from "./Room";
import { Window } from "./Window";
import { Door } from "./Door";
import { Fixture } from "./Fixture";
import { HeatmapPlane } from "./HeatmapPlane";

export default function Scene3D() {
  const room = useProjectStore((s) => s.room);
  const fixtures = useProjectStore((s) => s.fixtures);
  const result = useSimulationStore((s) => s.result);

  const { center, span } = useMemo(() => {
    if (!room) return { center: [0, 0, 0] as const, span: 10 };
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of room.outline) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return {
      center: [(minX + maxX) / 2, 0, -(minY + maxY) / 2] as const,
      span: Math.max(maxX - minX, maxY - minY, 4),
    };
  }, [room]);

  // Kamerayı yalnızca oda geometrisi/yüksekliği değişince yeniden
  // kadrajla (Bounds remount). Armatür ekleme/taşımada kamera zıplamaz.
  const fitKey = room
    ? `${room.outline.length}:${room.area.toFixed(3)}:${room.wallHeight}`
    : "none";

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [span, span * 0.9, span], fov: 50 }}
      className="rounded-lg border bg-slate-900"
    >
      <hemisphereLight intensity={0.6} groundColor="#475569" />
      <ambientLight intensity={0.25} />
      <directionalLight
        castShadow
        position={[span, span * 1.5, span * 0.6]}
        intensity={1.1}
        shadow-mapSize={[1024, 1024]}
      />

      <Bounds key={fitKey} fit clip margin={1.2}>
        <group position={[-center[0], 0, -center[2]]}>
          {room && <Room room={room} />}
          {room?.windows.map((w) => (
            <Window key={w.id} win={w} />
          ))}
          {room?.doors.map((d) => (
            <Door key={d.id} door={d} />
          ))}
          {fixtures.map((f) => (
            <Fixture key={f.id} fixture={f} />
          ))}
          {result && room && (
            <HeatmapPlane
              result={result}
              workplaneHeight={room.workplaneHeight}
            />
          )}
        </group>
      </Bounds>

      <Grid
        args={[40, 40]}
        cellSize={1}
        sectionSize={5}
        infiniteGrid
        fadeDistance={60}
        position={[0, -0.01, 0]}
        cellColor="#334155"
        sectionColor="#475569"
      />
      <OrbitControls makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>
      {process.env.NODE_ENV === "development" && <Stats />}
    </Canvas>
  );
}
