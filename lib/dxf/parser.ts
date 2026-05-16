// dxf-parser sarmalayıcısı: ham AutoCAD entity'lerini metre cinsinden,
// segment listesine indirgenmiş DxfEntity'lere çevirir; bbox hesaplar ve
// geometriyi orijine taşır. Tamamen istemci tarafında çalışır.

import DxfParser, {
  type IDxf,
  type IEntity,
  type ILineEntity,
  type ILwpolylineEntity,
  type IPolylineEntity,
  type IArcEntity,
  type ICircleEntity,
  type IInsertEntity,
  type I3DfaceEntity,
  type IPoint,
} from "dxf-parser";
import type {
  BBox,
  DxfDocument,
  DxfEntity,
  DxfEntityType,
  Point2D,
} from "@/types";

/** $INSUNITS kodu → metre ölçeği. Bilinmiyorsa mimari varsayım: mm. */
export const UNIT_SCALE: Record<number, { scale: number; name: string }> = {
  0: { scale: 0.001, name: "birimsiz (mm varsayıldı)" },
  1: { scale: 0.0254, name: "inç" },
  2: { scale: 0.3048, name: "feet" },
  4: { scale: 0.001, name: "mm" },
  5: { scale: 0.01, name: "cm" },
  6: { scale: 1, name: "m" },
  8: { scale: 1e-6, name: "mikron" },
};

/** Kullanıcının yükleme sonrası seçebileceği birimler (LayerMapper). */
export const UNIT_OPTIONS: { code: number; label: string }[] = [
  { code: 4, label: "Milimetre (mm)" },
  { code: 5, label: "Santimetre (cm)" },
  { code: 6, label: "Metre (m)" },
  { code: 1, label: "İnç (in)" },
  { code: 2, label: "Feet (ft)" },
];

const ARC_SEG_DEG = 6; // arc/circle tessellation çözünürlüğü

let _idCounter = 0;
const nextId = () => `e${(++_idCounter).toString(36)}`;

function arcPoints(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): Point2D[] {
  let sweep = endDeg - startDeg;
  while (sweep <= 0) sweep += 360;
  const steps = Math.max(2, Math.ceil(sweep / ARC_SEG_DEG));
  const pts: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((startDeg + (sweep * i) / steps) * Math.PI) / 180;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

/** Bulge'lı poliçizgi kenarını yaya açar (AutoCAD bulge formülü). */
function bulgeArc(p0: Point2D, p1: Point2D, bulge: number): Point2D[] {
  if (!bulge) return [p1];
  const theta = 4 * Math.atan(bulge);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const chord = Math.hypot(dx, dy);
  if (chord < 1e-9) return [p1];
  const r = chord / (2 * Math.sin(Math.abs(theta) / 2));
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const dir = bulge > 0 ? 1 : -1;
  const h = (r * Math.cos(Math.abs(theta) / 2)) * dir;
  const cx = mx - (dy / chord) * h;
  const cy = my + (dx / chord) * h;
  const a0 = Math.atan2(p0.y - cy, p0.x - cx);
  const steps = Math.max(2, Math.ceil((Math.abs(theta) * 180) / Math.PI / ARC_SEG_DEG));
  const out: Point2D[] = [];
  for (let i = 1; i <= steps; i++) {
    const a = a0 + (theta * i) / steps;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

interface Xform {
  ox: number;
  oy: number;
  sx: number;
  sy: number;
  rot: number; // rad
}
const IDENTITY: Xform = { ox: 0, oy: 0, sx: 1, sy: 1, rot: 0 };

function apply(p: { x: number; y: number }, t: Xform): Point2D {
  const x = p.x * t.sx;
  const y = p.y * t.sy;
  const c = Math.cos(t.rot);
  const s = Math.sin(t.rot);
  return { x: x * c - y * s + t.ox, y: x * s + y * c + t.oy };
}

function entityToSegments(
  e: IEntity,
  t: Xform
): { type: DxfEntityType; pts: Point2D[]; closed: boolean; radius?: number } | null {
  switch (e.type) {
    case "LINE": {
      const l = e as ILineEntity;
      if (!l.vertices?.length) return null;
      return {
        type: "LINE",
        pts: l.vertices.map((v) => apply(v, t)),
        closed: false,
      };
    }
    case "LWPOLYLINE": {
      const pl = e as ILwpolylineEntity;
      const v = pl.vertices ?? [];
      if (v.length < 2) return null;
      const pts: Point2D[] = [apply(v[0], t)];
      for (let i = 0; i < v.length - 1; i++) {
        const seg = bulgeArc(v[i], v[i + 1], v[i].bulge ?? 0);
        seg.forEach((p) => pts.push(apply(p, t)));
      }
      if (pl.shape && v.length > 2) {
        bulgeArc(v[v.length - 1], v[0], v[v.length - 1].bulge ?? 0).forEach(
          (p) => pts.push(apply(p, t))
        );
      }
      return { type: "LWPOLYLINE", pts, closed: !!pl.shape };
    }
    case "POLYLINE": {
      const pl = e as IPolylineEntity;
      const v = pl.vertices ?? [];
      if (v.length < 2) return null;
      return {
        type: "POLYLINE",
        pts: v.map((p) => apply(p, t)),
        closed: !!pl.shape,
      };
    }
    case "ARC": {
      const a = e as IArcEntity;
      return {
        type: "ARC",
        pts: arcPoints(
          a.center.x,
          a.center.y,
          a.radius,
          a.startAngle * (180 / Math.PI),
          a.endAngle * (180 / Math.PI)
        ).map((p) => apply(p, t)),
        closed: false,
        radius: a.radius * t.sx,
      };
    }
    case "CIRCLE": {
      const c = e as ICircleEntity;
      return {
        type: "CIRCLE",
        pts: arcPoints(c.center.x, c.center.y, c.radius, 0, 360).map((p) =>
          apply(p, t)
        ),
        closed: true,
        radius: c.radius * t.sx,
      };
    }
    case "3DFACE": {
      const f = e as I3DfaceEntity;
      if (!f.vertices?.length) return null;
      return {
        type: "3DFACE",
        pts: f.vertices.map((p: IPoint) => apply(p, t)),
        closed: true,
      };
    }
    default:
      return null;
  }
}

export interface ParseResult {
  doc: DxfDocument;
  warnings: string[];
}

/** DXF metnini parse edip normalize edilmiş DxfDocument döner. */
export function parseDxf(text: string, unitOverride?: number): ParseResult {
  const parser = new DxfParser();
  const dxf = parser.parseSync(text) as IDxf | null;
  const warnings: string[] = [];
  if (!dxf) throw new Error("DXF parse edilemedi (geçersiz veya bozuk dosya).");

  const insCode =
    unitOverride ??
    (typeof dxf.header?.["$INSUNITS"] === "number"
      ? (dxf.header["$INSUNITS"] as number)
      : 0);
  const unit = UNIT_SCALE[insCode] ?? UNIT_SCALE[0];
  const scale = unit.scale;
  if (insCode === 0 && unitOverride === undefined)
    warnings.push(
      "DXF birim bilgisi yok — milimetre varsayıldı. Gerekirse birimi değiştirin."
    );

  const out: DxfEntity[] = [];

  const pushEntity = (e: IEntity, t: Xform) => {
    if (e.type === "INSERT") {
      const ins = e as IInsertEntity;
      const block = dxf.blocks?.[ins.name];
      if (!block?.entities?.length) return;
      const childT: Xform = {
        ox: t.ox + (ins.position?.x ?? 0) * t.sx,
        oy: t.oy + (ins.position?.y ?? 0) * t.sy,
        sx: t.sx * (ins.xScale ?? 1),
        sy: t.sy * (ins.yScale ?? 1),
        rot: t.rot + ((ins.rotation ?? 0) * Math.PI) / 180,
      };
      // Tek seviye blok genişletme (iç içe INSERT'ler atlanır).
      for (const child of block.entities) {
        if (child.type === "INSERT") continue;
        const seg = entityToSegments(child, childT);
        if (seg)
          out.push({
            id: nextId(),
            type: seg.type,
            layer: child.layer || ins.layer || "0",
            points: seg.pts,
            closed: seg.closed,
            radius: seg.radius,
            blockName: ins.name,
          });
      }
      return;
    }
    const seg = entityToSegments(e, t);
    if (seg)
      out.push({
        id: nextId(),
        type: seg.type,
        layer: e.layer || "0",
        points: seg.pts,
        closed: seg.closed,
        radius: seg.radius,
      });
  };

  for (const e of dxf.entities ?? []) pushEntity(e, IDENTITY);

  if (out.length === 0)
    throw new Error(
      "DXF içinde çizilebilir geometri bulunamadı (LINE/POLYLINE/ARC/CIRCLE/INSERT)."
    );

  // Birim ölçeği uygula + bbox hesapla.
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const ent of out) {
    for (const p of ent.points) {
      p.x *= scale;
      p.y *= scale;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    if (ent.radius) ent.radius *= scale;
  }

  // Orijine taşı (sol-alt köşe → 0,0).
  for (const ent of out)
    for (const p of ent.points) {
      p.x -= minX;
      p.y -= minY;
    }

  const bbox: BBox = {
    min: { x: 0, y: 0 },
    max: { x: maxX - minX, y: maxY - minY },
  };

  const layerSet = new Set<string>();
  for (const ent of out) layerSet.add(ent.layer);
  const tableLayers = dxf.tables?.layer?.layers ?? {};
  Object.keys(tableLayers).forEach((l) => layerSet.add(l));

  const doc: DxfDocument = {
    entities: out,
    layers: Array.from(layerSet).sort(),
    bbox,
    unitScale: scale,
    rawUnit: unit.name,
    insCode,
  };
  return { doc, warnings };
}

/**
 * Yükleme sonrası birim düzeltmesi. Geometri zaten metreye çevrilip köşesi
 * orijine (0,0) oturtulduğundan, tüm noktaları `k = yeniÖlçek / eskiÖlçek`
 * ile çarpmak orijin köşesini sabit tutarak planı orantılı yeniden
 * ölçekler — yeniden parse gerektirmez. Yeni bir DxfDocument döner.
 */
export function rescaleDxf(doc: DxfDocument, insCode: number): DxfDocument {
  const unit = UNIT_SCALE[insCode] ?? UNIT_SCALE[0];
  const k = unit.scale / doc.unitScale;
  if (!Number.isFinite(k) || k <= 0 || Math.abs(k - 1) < 1e-12) {
    return { ...doc, insCode, unitScale: unit.scale, rawUnit: unit.name };
  }
  const entities = doc.entities.map((e) => ({
    ...e,
    points: e.points.map((p) => ({ x: p.x * k, y: p.y * k })),
    radius: e.radius != null ? e.radius * k : e.radius,
  }));
  return {
    ...doc,
    entities,
    bbox: {
      min: { x: doc.bbox.min.x * k, y: doc.bbox.min.y * k },
      max: { x: doc.bbox.max.x * k, y: doc.bbox.max.y * k },
    },
    unitScale: unit.scale,
    rawUnit: unit.name,
    insCode,
  };
}
