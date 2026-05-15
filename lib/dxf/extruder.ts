// Sınıflandırılmış 2D DXF entity'lerini simülasyona hazır bir Room'a çevirir:
// duvar segmentleri, pencere/kapı açıklıkları, oda dış çizgisi ve alan (shoelace).
// Bu, projectStore.buildRoomFromDxf() köprüsünün çekirdeğidir.

import type {
  DxfDocument,
  LayerMapping,
  Point2D,
  Room,
  Wall,
  WindowOpening,
  Door,
  Material,
} from "@/types";

export interface RoomParams {
  wallHeight: number;
  wallThickness: number;
  sillHeight: number; // parapet (m)
  glassTransmittance: number;
  doorHeight: number;
  material: Material;
  maintenanceFactor: number;
  workplaneHeight: number;
}

export const DEFAULT_ROOM_PARAMS: RoomParams = {
  wallHeight: 2.7,
  wallThickness: 0.2,
  sillHeight: 0.9,
  glassTransmittance: 0.7,
  doorHeight: 2.1,
  material: { ceiling: 0.7, wall: 0.5, floor: 0.2 },
  maintenanceFactor: 0.8,
  workplaneHeight: 0.8,
};

/** Kapalı poligon işaretli alanı (shoelace). */
export function polygonArea(poly: Point2D[]): number {
  let a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

const dist = (a: Point2D, b: Point2D) => Math.hypot(b.x - a.x, b.y - a.y);
const mid = (a: Point2D, b: Point2D): Point2D => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/** Noktanın bir segmente en kısa uzaklığı. */
function pointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

let _wid = 0;
const wid = (pfx: string) => `${pfx}${(++_wid).toString(36)}`;

export function buildRoom(
  doc: DxfDocument,
  mapping: LayerMapping,
  params: RoomParams = DEFAULT_ROOM_PARAMS
): Room {
  const wallEnts = doc.entities.filter((e) => mapping[e.layer] === "wall");
  const winEnts = doc.entities.filter((e) => mapping[e.layer] === "window");
  const doorEnts = doc.entities.filter((e) => mapping[e.layer] === "door");

  // 1) Duvar segmentleri.
  const walls: Wall[] = [];
  for (const e of wallEnts) {
    const pts = e.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const s = pts[i];
      const t = pts[i + 1];
      if (dist(s, t) < 1e-4) continue;
      walls.push({
        id: wid("w"),
        start: { ...s },
        end: { ...t },
        height: params.wallHeight,
        thickness: params.wallThickness,
      });
    }
  }

  // 2) Oda dış çizgisi: en büyük alanlı kapalı duvar poligonu; yoksa duvar
  //    noktalarının eksen-hizalı sınır kutusu.
  let outline: Point2D[] = [];
  let bestArea = 0;
  for (const e of wallEnts) {
    if (e.points.length < 3) continue;
    const closedPts =
      e.closed ||
      dist(e.points[0], e.points[e.points.length - 1]) < 1e-3
        ? e.points
        : null;
    if (!closedPts) continue;
    const a = polygonArea(closedPts);
    if (a > bestArea) {
      bestArea = a;
      outline = closedPts.map((p) => ({ ...p }));
    }
  }
  if (outline.length < 3) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const all = wallEnts.flatMap((e) => e.points);
    const src = all.length ? all : doc.entities.flatMap((e) => e.points);
    for (const p of src) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    outline = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
  }
  const area = polygonArea(outline);

  // 3) Açıklığı en yakın duvara bağla.
  const nearestWall = (a: Point2D, b: Point2D): string => {
    if (!walls.length) return "";
    const m = mid(a, b);
    let best = walls[0].id;
    let bestD = Infinity;
    for (const w of walls) {
      const d = pointToSegment(m, w.start, w.end);
      if (d < bestD) {
        bestD = d;
        best = w.id;
      }
    }
    return best;
  };

  const windows: WindowOpening[] = winEnts.map((e) => {
    const a = e.points[0];
    const b = e.points[e.points.length - 1];
    return {
      id: wid("win"),
      wallId: nearestWall(a, b),
      start: { ...a },
      end: { ...b },
      sillHeight: params.sillHeight,
      headHeight: Math.max(
        params.sillHeight + 0.3,
        params.wallHeight - 0.3
      ),
      transmittance: params.glassTransmittance,
    };
  });

  const doors: Door[] = doorEnts.map((e) => {
    const a = e.points[0];
    const b = e.points[e.points.length - 1];
    return {
      id: wid("dr"),
      wallId: nearestWall(a, b),
      start: { ...a },
      end: { ...b },
      height: params.doorHeight,
    };
  });

  return {
    id: "room1",
    outline,
    walls,
    windows,
    doors,
    wallHeight: params.wallHeight,
    material: { ...params.material },
    maintenanceFactor: params.maintenanceFactor,
    area,
    workplaneHeight: params.workplaneHeight,
  };
}

/** Oda parametreleri değişince mevcut Room'u günceller (geometri korunur). */
export function applyRoomParams(room: Room, params: RoomParams): Room {
  return {
    ...room,
    wallHeight: params.wallHeight,
    material: { ...params.material },
    maintenanceFactor: params.maintenanceFactor,
    workplaneHeight: params.workplaneHeight,
    walls: room.walls.map((w) => ({
      ...w,
      height: params.wallHeight,
      thickness: params.wallThickness,
    })),
    windows: room.windows.map((win) => ({
      ...win,
      sillHeight: params.sillHeight,
      headHeight: Math.max(
        params.sillHeight + 0.3,
        params.wallHeight - 0.3
      ),
      transmittance: params.glassTransmittance,
    })),
  };
}

/**
 * "fixture" katmanına eşlenmiş entity'lerden armatür konumlarını çıkarır.
 * Her entity'nin ağırlık merkezi alınır; birbirine clusterDist'ten yakın
 * olanlar tek armatüre indirgenir (çok çizgili bir blok = 1 armatür).
 */
export function extractFixturePositions(
  doc: DxfDocument,
  mapping: LayerMapping,
  clusterDist = 0.4
): Point2D[] {
  const ents = doc.entities.filter((e) => mapping[e.layer] === "fixture");
  const centroids: Point2D[] = [];
  for (const e of ents) {
    if (!e.points.length) continue;
    let sx = 0,
      sy = 0;
    for (const p of e.points) {
      sx += p.x;
      sy += p.y;
    }
    centroids.push({ x: sx / e.points.length, y: sy / e.points.length });
  }
  // Basit kümeleme.
  const clusters: { x: number; y: number; n: number }[] = [];
  for (const c of centroids) {
    const hit = clusters.find(
      (k) => Math.hypot(k.x / k.n - c.x, k.y / k.n - c.y) < clusterDist
    );
    if (hit) {
      hit.x += c.x;
      hit.y += c.y;
      hit.n += 1;
    } else {
      clusters.push({ x: c.x, y: c.y, n: 1 });
    }
  }
  return clusters.map((k) => ({ x: k.x / k.n, y: k.y / k.n }));
}
