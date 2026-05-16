// Sınıflandırılmış 2D DXF entity'lerini simülasyona hazır bir Room'a çevirir:
// duvar segmentleri, pencere/kapı açıklıkları, oda dış çizgisi ve alan (shoelace).
// Bu, projectStore.buildRoomFromDxf() köprüsünün çekirdeğidir.

import type {
  BBox,
  DxfDocument,
  DxfEntity,
  FloorRegion,
  LayerMapping,
  ManualElements,
  Point2D,
  Room,
  Wall,
  WindowOpening,
  Door,
  Material,
} from "@/types";

/** buildRoom/extract filtreleri: gizli katmanlar + seçili kat bölgesi. */
export interface BuildOpts {
  hidden?: Set<string>;
  floor?: BBox | null;
}

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

const centroid = (pts: Point2D[]): Point2D => {
  let sx = 0,
    sy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / pts.length, y: sy / pts.length };
};

const ptsBBox = (pts: Point2D[]): BBox => {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
};

const inBBox = (p: Point2D, b: BBox, m = 1e-6): boolean =>
  p.x >= b.min.x - m &&
  p.x <= b.max.x + m &&
  p.y >= b.min.y - m &&
  p.y <= b.max.y + m;

const bboxOverlap = (a: BBox, b: BBox, gap: number): boolean =>
  a.min.x - gap <= b.max.x &&
  a.max.x + gap >= b.min.x &&
  a.min.y - gap <= b.max.y &&
  a.max.y + gap >= b.min.y;

/** Tür eşlemesi + gizli katman + (varsa) kat bölgesine göre entity süzer. */
function pickEntities(
  doc: DxfDocument,
  mapping: LayerMapping,
  type: string,
  opts?: BuildOpts
): DxfEntity[] {
  const hidden = opts?.hidden;
  const floor = opts?.floor;
  return doc.entities.filter((e) => {
    if (mapping[e.layer] !== type) return false;
    if (hidden?.has(e.layer)) return false;
    if (floor && e.points.length && !inBBox(centroid(e.points), floor, 0.5))
      return false;
    return true;
  });
}

/** Bir açıklık segmentinin orta noktasına en yakın duvarın id'si. */
export function nearestWallId(
  walls: Wall[],
  a: Point2D,
  b: Point2D
): string {
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
}

export function buildRoom(
  doc: DxfDocument,
  mapping: LayerMapping,
  params: RoomParams = DEFAULT_ROOM_PARAMS,
  opts?: BuildOpts
): Room {
  const wallEnts = pickEntities(doc, mapping, "wall", opts);
  const winEnts = pickEntities(doc, mapping, "window", opts);
  const doorEnts = pickEntities(doc, mapping, "door", opts);

  // 1) Duvar segmentleri. Aynı segment birden çok entity'de tekrar
  //    çizilmiş olabilir (kapalı poligonun kapanışı, üst üste binen
  //    poliçizgiler) — yön bağımsız tekilleştir; 3D'de hayalet/çift
  //    duvar kutularını önler. (outline/area bundan etkilenmez.)
  const walls: Wall[] = [];
  const SNAP = 1e-3; // 1 mm
  const seen = new Set<string>();
  const segKey = (a: Point2D, b: Point2D) => {
    const q = (v: number) => Math.round(v / SNAP);
    const ka = `${q(a.x)},${q(a.y)}`;
    const kb = `${q(b.x)},${q(b.y)}`;
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`; // yön bağımsız
  };
  for (const e of wallEnts) {
    const pts = e.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const s = pts[i];
      const t = pts[i + 1];
      if (dist(s, t) < 1e-4) continue;
      const key = segKey(s, t);
      if (seen.has(key)) continue;
      seen.add(key);
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

  // 3) Açıklığı en yakın duvara bağla. Cam yüksekliği parapetten duvar
  //    üstüne kadar OTOMATİK: headHeight = wallHeight (sabit lento yok).
  const windows: WindowOpening[] = winEnts.map((e) => {
    const a = e.points[0];
    const b = e.points[e.points.length - 1];
    return {
      id: wid("win"),
      wallId: nearestWallId(walls, a, b),
      start: { ...a },
      end: { ...b },
      sillHeight: params.sillHeight,
      headHeight: params.wallHeight,
      transmittance: params.glassTransmittance,
    };
  });

  const doors: Door[] = doorEnts.map((e) => {
    const a = e.points[0];
    const b = e.points[e.points.length - 1];
    return {
      id: wid("dr"),
      wallId: nearestWallId(walls, a, b),
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
      headHeight: params.wallHeight, // parapetten tavana otomatik
      transmittance: params.glassTransmittance,
    })),
  };
}

/**
 * Kullanıcının elle çizdiği segmentleri Room'a ekler. Duvarlar/açıklıklar
 * güncel parametrelerle üretilir; pencere/kapı en yakın duvara bağlanır
 * (manuel duvarlar da dahil). outline/area DXF'ten geldiği gibi kalır —
 * manuel duvarlar ek engel/yüzey olarak eklenir.
 */
export function applyManual(
  room: Room,
  manual: ManualElements,
  params: RoomParams
): Room {
  if (
    !manual.walls.length &&
    !manual.windows.length &&
    !manual.doors.length
  )
    return room;

  const mWalls: Wall[] = manual.walls.map((s) => ({
    id: s.id,
    start: { ...s.start },
    end: { ...s.end },
    height: params.wallHeight,
    thickness: params.wallThickness,
  }));
  const walls = [...room.walls, ...mWalls];

  const mWindows: WindowOpening[] = manual.windows.map((s) => ({
    id: s.id,
    wallId: nearestWallId(walls, s.start, s.end),
    start: { ...s.start },
    end: { ...s.end },
    sillHeight: params.sillHeight,
    headHeight: params.wallHeight,
    transmittance: params.glassTransmittance,
  }));
  const mDoors: Door[] = manual.doors.map((s) => ({
    id: s.id,
    wallId: nearestWallId(walls, s.start, s.end),
    start: { ...s.start },
    end: { ...s.end },
    height: params.doorHeight,
  }));

  return {
    ...room,
    walls,
    windows: [...room.windows, ...mWindows],
    doors: [...room.doors, ...mDoors],
  };
}

/**
 * Çoklu kat / yan yana çizilmiş plan kümelerini tespit eder. Duvar
 * entity'lerinin sınır kutuları (gap toleranslı) çakışanlar tek bölgeye
 * birleştirilir (union-find). Birden az bölge varsa [] döner (tek kat).
 */
export function detectFloors(
  doc: DxfDocument,
  mapping: LayerMapping,
  hidden?: Set<string>
): FloorRegion[] {
  const ents = doc.entities.filter(
    (e) =>
      mapping[e.layer] === "wall" &&
      !hidden?.has(e.layer) &&
      e.points.length > 1
  );
  if (ents.length < 2) return [];

  const boxes = ents.map((e) => ptsBBox(e.points));
  const diag = Math.hypot(
    doc.bbox.max.x - doc.bbox.min.x,
    doc.bbox.max.y - doc.bbox.min.y
  );
  // Aynı kata ait parçalar birbirine yakın; katlar arası boşluk büyük.
  const gap = Math.max(0.5, diag * 0.02);

  const parent = ents.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  for (let i = 0; i < ents.length; i++)
    for (let j = i + 1; j < ents.length; j++)
      if (bboxOverlap(boxes[i], boxes[j], gap)) union(i, j);

  const groups = new Map<number, number[]>();
  for (let i = 0; i < ents.length; i++) {
    const r = find(i);
    (groups.get(r) ?? groups.set(r, []).get(r)!).push(i);
  }
  if (groups.size < 2) return [];

  const regions: FloorRegion[] = [];
  let n = 0;
  for (const idxs of Array.from(groups.values())) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let bestArea = 0;
    for (const i of idxs) {
      const e = ents[i];
      const bb = boxes[i];
      minX = Math.min(minX, bb.min.x);
      minY = Math.min(minY, bb.min.y);
      maxX = Math.max(maxX, bb.max.x);
      maxY = Math.max(maxY, bb.max.y);
      const closed =
        e.points.length >= 3 &&
        (e.closed ||
          dist(e.points[0], e.points[e.points.length - 1]) < 1e-3);
      if (closed) bestArea = Math.max(bestArea, polygonArea(e.points));
    }
    const bbox: BBox = {
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY },
    };
    n += 1;
    regions.push({
      id: `floor${n}`,
      label: `Bölge ${n} · ${(maxX - minX).toFixed(1)}×${(
        maxY - minY
      ).toFixed(1)} m${bestArea ? ` · ${bestArea.toFixed(0)} m²` : ""}`,
      bbox,
      area: bestArea,
    });
  }
  // Büyük alan/boyut önce.
  regions.sort(
    (a, b) =>
      b.area - a.area ||
      (b.bbox.max.x - b.bbox.min.x) * (b.bbox.max.y - b.bbox.min.y) -
        (a.bbox.max.x - a.bbox.min.x) * (a.bbox.max.y - a.bbox.min.y)
  );
  return regions.map((r, i) => ({
    ...r,
    id: `floor${i + 1}`,
    label: r.label.replace(/^Bölge \d+/, `Bölge ${i + 1}`),
  }));
}

/**
 * "fixture" katmanına eşlenmiş entity'lerden armatür konumlarını çıkarır.
 * Her entity'nin ağırlık merkezi alınır; birbirine clusterDist'ten yakın
 * olanlar tek armatüre indirgenir (çok çizgili bir blok = 1 armatür).
 */
export function extractFixturePositions(
  doc: DxfDocument,
  mapping: LayerMapping,
  clusterDist = 0.4,
  opts?: BuildOpts
): Point2D[] {
  const ents = pickEntities(doc, mapping, "fixture", opts);
  const centroids: Point2D[] = [];
  for (const e of ents) {
    if (!e.points.length) continue;
    centroids.push(centroid(e.points));
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
