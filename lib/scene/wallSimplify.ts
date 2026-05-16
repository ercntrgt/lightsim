// SALT GÖRSEL duvar sadeleştirme — yalnız 3D sahne (Room.tsx) için.
// `room.walls` (simülasyon/ray tracing girdisi) DEĞİŞTİRİLMEZ; bu fonksiyon
// yeni bir dizi döner. Amaç: çift çizgi + binlerce kısa segmentten oluşan
// "çubuk ormanı" görünümünü gerçek, sürekli duvarlara indirgemek.

import type { Point2D, Wall } from "@/types";

export interface RenderWall {
  id: string;
  start: Point2D;
  end: Point2D;
  height: number;
  thickness: number;
}

const SNAP = 0.02; // 2 cm — uç nokta yapıştırma
const MIN_LEN = 0.12; // bundan kısa segment gürültüdür, atılır
const COLLINEAR_DOT = 0.9986; // ~3° tolerans
const MAX_PAIR_GAP = 0.45; // paralel çift-çizgi azami eksen aralığı (m)
const PAIR_PASS_CAP = 1600; // bu sayıyı aşan modelde O(n²) çifti atla

const key = (p: Point2D) =>
  `${Math.round(p.x / SNAP)}:${Math.round(p.y / SNAP)}`;
const len = (a: Point2D, b: Point2D) => Math.hypot(b.x - a.x, b.y - a.y);

interface Seg {
  a: Point2D;
  b: Point2D;
  h: number;
  t: number;
  dead?: boolean;
}

/** Bir uçtan ileri giden birim yön. */
function unit(from: Point2D, to: Point2D): Point2D {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
}

/** Aynı doğrultudaki, uç uca bağlı segment zincirlerini tek segmente indir. */
function mergeCollinear(segs: Seg[]): Seg[] {
  let changed = true;
  let guard = 0;
  while (changed && guard++ < segs.length + 5) {
    changed = false;
    const live = segs.filter((s) => !s.dead);
    // Uç nokta → o uca değen segmentler.
    const vert = new Map<string, Seg[]>();
    for (const s of live) {
      (vert.get(key(s.a)) ?? vert.set(key(s.a), []).get(key(s.a))!).push(s);
      (vert.get(key(s.b)) ?? vert.set(key(s.b), []).get(key(s.b))!).push(s);
    }
    for (const list of Array.from(vert.values())) {
      if (list.length !== 2) continue; // yalnız basit geçiş düğümü
      const [s1, s2] = list;
      if (s1.dead || s2.dead || s1 === s2) continue;
      // Ortak düğüm.
      const shared =
        key(s1.a) === key(s2.a) || key(s1.a) === key(s2.b) ? s1.a : s1.b;
      const far1 = key(s1.a) === key(shared) ? s1.b : s1.a;
      const far2 = key(s2.a) === key(shared) ? s2.b : s2.a;
      const d1 = unit(shared, far1);
      const d2 = unit(shared, far2);
      // Düz devam: iki yön zıt (nokta çarpımı ≈ -1).
      if (d1.x * d2.x + d1.y * d2.y > -COLLINEAR_DOT) continue;
      s1.dead = true;
      s2.dead = true;
      segs.push({
        a: far1,
        b: far2,
        h: Math.max(s1.h, s2.h),
        t: Math.max(s1.t, s2.t),
      });
      changed = true;
    }
  }
  return segs.filter((s) => !s.dead);
}

/** Yakın paralel çift çizgileri orta eksene indir (kalınlık = aradaki mesafe). */
function collapseDoubleLines(segs: Seg[]): Seg[] {
  if (segs.length > PAIR_PASS_CAP) return segs;
  const out: Seg[] = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.dead) continue;
    const di = unit(s.a, s.b);
    const li = len(s.a, s.b);
    for (let j = i + 1; j < segs.length; j++) {
      const o = segs[j];
      if (o.dead) continue;
      const dj = unit(o.a, o.b);
      const par = Math.abs(di.x * dj.x + di.y * dj.y);
      if (par < COLLINEAR_DOT) continue; // paralel değil
      // o.a'nın s doğrusuna dik uzaklığı.
      const nx = -di.y;
      const ny = di.x;
      const perp = Math.abs((o.a.x - s.a.x) * nx + (o.a.y - s.a.y) * ny);
      if (perp < 1e-3 || perp > MAX_PAIR_GAP) continue;
      // Eksen üzerinde örtüşme var mı? (o uçlarını s yönüne projekte et)
      const proj = (p: Point2D) =>
        (p.x - s.a.x) * di.x + (p.y - s.a.y) * di.y;
      const oj0 = Math.min(proj(o.a), proj(o.b));
      const oj1 = Math.max(proj(o.a), proj(o.b));
      const overlap = Math.min(li, oj1) - Math.max(0, oj0);
      if (overlap < 0.3 * Math.min(li, len(o.a, o.b))) continue;
      // Orta eksen: iki segmentin orta noktalarının ortalamasından, s yönünde.
      const mid = {
        x: (s.a.x + s.b.x + o.a.x + o.b.x) / 4,
        y: (s.a.y + s.b.y + o.a.y + o.b.y) / 4,
      };
      const lo = Math.max(0, oj0);
      const hi = Math.min(li, oj1);
      const half = (hi - lo) / 2 || li / 2;
      const c = (lo + hi) / 2;
      const center = {
        x: s.a.x + di.x * c,
        y: s.a.y + di.y * c,
      };
      // mid'i eksen üzerinde center'a hizala (dik bileşeni mid'den al).
      const cx = center.x + (mid.x - center.x) - di.x * ((mid.x - center.x) * di.x + (mid.y - center.y) * di.y);
      const cy = center.y + (mid.y - center.y) - di.y * ((mid.x - center.x) * di.x + (mid.y - center.y) * di.y);
      s.dead = true;
      o.dead = true;
      out.push({
        a: { x: cx - di.x * half, y: cy - di.y * half },
        b: { x: cx + di.x * half, y: cy + di.y * half },
        h: Math.max(s.h, o.h),
        t: Math.min(0.4, Math.max(0.08, perp)),
      });
      break; // s tüketildi
    }
    if (!s.dead) out.push(s);
  }
  return out.filter((x) => !x.dead);
}

export function simplifyWalls(walls: Wall[]): RenderWall[] {
  if (!walls.length) return [];
  let segs: Seg[] = walls
    .filter((w) => len(w.start, w.end) >= MIN_LEN)
    .map((w) => ({
      a: { ...w.start },
      b: { ...w.end },
      h: w.height,
      t: w.thickness,
    }));
  if (!segs.length) return [];

  segs = mergeCollinear(segs);
  segs = collapseDoubleLines(segs);
  // İkinci geçiş: çift çizgi indirildikten sonra yeniden zincirle.
  segs = mergeCollinear(segs);

  return segs
    .filter((s) => len(s.a, s.b) >= MIN_LEN)
    .map((s, i) => ({
      id: `rw${i}`,
      start: s.a,
      end: s.b,
      height: s.h,
      thickness: s.t,
    }));
}
