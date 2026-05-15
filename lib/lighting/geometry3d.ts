// Ray tracer için oda geometrisi: zemin/tavan/duvar üçgenleri (kapalı kutu) +
// pencere açıklığı dikdörtgenleri. Koordinat çerçevesi: (x_plan, y_plan, z_yük).

import type { Point2D, Room } from "@/types";

export interface WindowRect {
  ox: number;
  oy: number;
  oz: number; // köşe (origin)
  ex: number;
  ey: number;
  ez: number; // genişlik birim vektörü
  ux: number;
  uy: number;
  uz: number; // yükseklik birim vektörü (0,0,1)
  w: number;
  h: number;
  nx: number;
  ny: number;
  nz: number; // düzlem normali (yatay)
  tau: number; // cam geçirgenliği
}

export interface OccluderGeometry {
  positions: Float32Array; // indekssiz üçgenler (xyz)
  windows: WindowRect[];
  wallHeight: number;
}

/** Basit kulak-kırpma (ear clipping) — basit/konkav poligonları üçgenler. */
function earClip(poly: Point2D[]): number[] {
  const n = poly.length;
  if (n < 3) return [];
  const idx = Array.from({ length: n }, (_, i) => i);
  // Yön (CCW) tespiti.
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    area += a.x * b.y - b.x * a.y;
  }
  if (area < 0) idx.reverse();

  const tris: number[] = [];
  const cross = (ax: number, ay: number, bx: number, by: number) =>
    ax * by - ay * bx;
  const inTri = (
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number
  ) => {
    const d1 = cross(bx - ax, by - ay, px - ax, py - ay);
    const d2 = cross(cx - bx, cy - by, px - bx, py - by);
    const d3 = cross(ax - cx, ay - cy, px - cx, py - cy);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  };

  let guard = 0;
  while (idx.length > 3 && guard++ < 5000) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i - 1 + idx.length) % idx.length];
      const i1 = idx[i];
      const i2 = idx[(i + 1) % idx.length];
      const a = poly[i0];
      const b = poly[i1];
      const c = poly[i2];
      if (cross(b.x - a.x, b.y - a.y, c.x - a.x, c.y - a.y) <= 0) continue; // konveks değil
      let ear = true;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        if (inTri(poly[j].x, poly[j].y, a.x, a.y, b.x, b.y, c.x, c.y)) {
          ear = false;
          break;
        }
      }
      if (ear) {
        tris.push(i0, i1, i2);
        idx.splice(i, 1);
        clipped = true;
        break;
      }
    }
    if (!clipped) break; // dejenere — kalanları fan ile kapat
  }
  if (idx.length === 3) tris.push(idx[0], idx[1], idx[2]);
  else for (let i = 1; i < idx.length - 1; i++) tris.push(idx[0], idx[i], idx[i + 1]);
  return tris;
}

export function buildOccluders(room: Room): OccluderGeometry {
  const H = room.wallHeight;
  const outline = room.outline;
  const tri = earClip(outline);
  const verts: number[] = [];

  const pushTri = (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    x3: number,
    y3: number,
    z3: number
  ) => verts.push(x1, y1, z1, x2, y2, z2, x3, y3, z3);

  // Zemin (z=0) ve tavan (z=H).
  for (let i = 0; i < tri.length; i += 3) {
    const a = outline[tri[i]];
    const b = outline[tri[i + 1]];
    const c = outline[tri[i + 2]];
    pushTri(a.x, a.y, 0, b.x, b.y, 0, c.x, c.y, 0);
    pushTri(a.x, a.y, H, b.x, b.y, H, c.x, c.y, H);
  }

  // Duvarlar — her segment dikey dikdörtgen (2 üçgen).
  for (const w of room.walls) {
    const { start: s, end: e } = w;
    pushTri(s.x, s.y, 0, e.x, e.y, 0, e.x, e.y, H);
    pushTri(s.x, s.y, 0, e.x, e.y, H, s.x, s.y, H);
  }

  // Pencere açıklıkları (duvar mesh'i deliği kapatmaz; isabet noktası
  // dikdörtgen içindeyse "gökyüzü" sayılır).
  const windows: WindowRect[] = room.windows.map((win) => {
    const dx = win.end.x - win.start.x;
    const dy = win.end.y - win.start.y;
    const w = Math.hypot(dx, dy) || 0.001;
    const ex = dx / w;
    const ey = dy / w;
    const h = Math.max(0.05, win.headHeight - win.sillHeight);
    // Yatay normal (duvara dik).
    const nx = -ey;
    const ny = ex;
    return {
      ox: win.start.x,
      oy: win.start.y,
      oz: win.sillHeight,
      ex,
      ey,
      ez: 0,
      ux: 0,
      uy: 0,
      uz: 1,
      w,
      h,
      nx,
      ny,
      nz: 0,
      tau: win.transmittance,
    };
  });

  return { positions: new Float32Array(verts), windows, wallHeight: H };
}

/** İsabet noktası bir pencere dikdörtgeninin içindeyse cam τ'sını döner. */
export function windowTauAt(
  px: number,
  py: number,
  pz: number,
  windows: WindowRect[]
): number | null {
  for (const r of windows) {
    const rx = px - r.ox;
    const ry = py - r.oy;
    const rz = pz - r.oz;
    const dPlane = rx * r.nx + ry * r.ny + rz * r.nz;
    if (Math.abs(dPlane) > 0.06) continue; // düzleme yakın değil
    const u = rx * r.ex + ry * r.ey + rz * r.ez; // genişlik
    const v = rx * r.ux + ry * r.uy + rz * r.uz; // yükseklik
    if (u >= -0.02 && u <= r.w + 0.02 && v >= -0.02 && v <= r.h + 0.02)
      return r.tau;
  }
  return null;
}
