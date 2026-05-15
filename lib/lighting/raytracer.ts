// three-mesh-bvh ile hızlandırılmış Monte Carlo günışığı ray tracer.
// Kosinüs-ağırlıklı yarımküre örneklemesi + 2 sıçrama difüz interreflection.
// Çerçeve: (x,y,z) = (plan x, plan y, yükseklik), yukarı = +Z.

import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import type { Point2D, Room } from "@/types";
import { buildOccluders, windowTauAt } from "@/lib/lighting/geometry3d";

export interface SkyFns {
  /** cz = ışın yön vektörünün +Z bileşeni (zenit kosinüsü). */
  overcast: (cz: number) => number; // cd/m² (DF için CIE overcast)
  selected: (cz: number) => number; // cd/m² (seçili gök — lüks için)
}

export interface RayGridResult {
  selLux: number[];
  overcastLux: number[];
}

const MAX_BOUNCE = 2;

export function rayTraceGrid(
  room: Room,
  points: Point2D[],
  samples: number,
  sky: SkyFns,
  workplaneZ: number,
  onProgress?: (f: number) => void
): RayGridResult {
  const occ = buildOccluders(room);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.BufferAttribute(occ.positions, 3)
  );
  const bvh = new MeshBVH(geom);
  const H = occ.wallHeight;

  // Oda merkezi (duvar normalini içe çevirmek için).
  let cxg = 0,
    cyg = 0;
  for (const p of room.outline) {
    cxg += p.x;
    cyg += p.y;
  }
  cxg /= room.outline.length;
  cyg /= room.outline.length;

  const ray = new THREE.Ray();
  const tmpDir = new THREE.Vector3();

  // Verilen normal etrafında kosinüs-ağırlıklı örnek yön.
  const sampleCosine = (
    nx: number,
    ny: number,
    nz: number,
    out: THREE.Vector3
  ) => {
    // Ortonormal taban.
    const sign = nz >= 0 ? 1 : -1;
    const a = -1 / (sign + nz);
    const b = nx * ny * a;
    const tx = 1 + sign * nx * nx * a;
    const ty = sign * b;
    const tz = -sign * nx;
    const bx = b;
    const by = sign + ny * ny * a;
    const bz = -ny;
    const u1 = Math.random();
    const u2 = Math.random();
    const r = Math.sqrt(u1);
    const phi = 2 * Math.PI * u2;
    const lx = r * Math.cos(phi);
    const ly = r * Math.sin(phi);
    const lz = Math.sqrt(Math.max(0, 1 - u1));
    out.set(
      lx * tx + ly * bx + lz * nx,
      lx * ty + ly * by + lz * ny,
      lx * tz + ly * bz + lz * nz
    );
    out.normalize();
  };

  // Tek ışının taşıdığı gök radyansı (interreflection ile).
  const trace = (
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    depth: number
  ): [number, number] => {
    ray.origin.set(ox + dx * 1e-4, oy + dy * 1e-4, oz + dz * 1e-4);
    ray.direction.set(dx, dy, dz);
    const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
    if (!hit) return [0, 0]; // kapalı kutu — gök yok
    const hp = hit.point;
    const tau = windowTauAt(hp.x, hp.y, hp.z, occ.windows);
    if (tau != null) {
      const cz = Math.max(0, dz);
      return [sky.selected(cz) * tau, sky.overcast(cz) * tau];
    }
    if (depth >= MAX_BOUNCE) return [0, 0];

    // Yüzey türü + normal + yansıtıcılık.
    let nx = 0,
      ny = 0,
      nz = 0,
      rho: number;
    if (hp.z < 0.06) {
      nz = 1;
      rho = room.material.floor;
    } else if (hp.z > H - 0.06) {
      nz = -1;
      rho = room.material.ceiling;
    } else {
      // Duvar — içe doğru yatay normal.
      nx = cxg - hp.x;
      ny = cyg - hp.y;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      rho = room.material.wall;
    }
    if (rho <= 0.01) return [0, 0];
    sampleCosine(nx, ny, nz, tmpDir);
    const [s, o] = trace(
      hp.x,
      hp.y,
      hp.z,
      tmpDir.x,
      tmpDir.y,
      tmpDir.z,
      depth + 1
    );
    return [rho * s, rho * o];
  };

  const selLux: number[] = new Array(points.length);
  const overcastLux: number[] = new Array(points.length);
  let reported = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    let accS = 0,
      accO = 0;
    for (let s = 0; s < samples; s++) {
      sampleCosine(0, 0, 1, tmpDir); // yukarı yarımküre
      const [vs, vo] = trace(
        p.x,
        p.y,
        workplaneZ,
        tmpDir.x,
        tmpDir.y,
        tmpDir.z,
        0
      );
      accS += vs;
      accO += vo;
    }
    // Kosinüs-ağırlıklı MC: E = (π/N) Σ L
    const k = Math.PI / samples;
    selLux[i] = accS * k;
    overcastLux[i] = accO * k;
    const frac = (i + 1) / points.length;
    if (frac - reported >= 0.02) {
      reported = frac;
      onProgress?.(frac);
    }
  }
  onProgress?.(1);
  return { selLux, overcastLux };
}
