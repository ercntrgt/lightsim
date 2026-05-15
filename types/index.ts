// LightSim — merkezi tip sözleşmesi. lib/stores/components bu dosyayı import eder.

export type ElementType =
  | "wall"
  | "window"
  | "door"
  | "fixture"
  | "ignore";

export interface Point2D {
  x: number;
  y: number;
}
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type DxfEntityType =
  | "LINE"
  | "LWPOLYLINE"
  | "POLYLINE"
  | "ARC"
  | "CIRCLE"
  | "INSERT"
  | "3DFACE";

/** dxf-parser entity'sinin normalize edilmiş, segment listesine indirgenmiş hali. */
export interface DxfEntity {
  id: string;
  type: DxfEntityType;
  layer: string;
  /** Arc/circle tessellate edilmiş; polyline noktaları metre cinsinden. */
  points: Point2D[];
  closed?: boolean;
  radius?: number;
  blockName?: string;
}

export interface BBox {
  min: Point2D;
  max: Point2D;
}

export interface DxfDocument {
  entities: DxfEntity[];
  layers: string[];
  bbox: BBox;
  /** Ham koordinatlar zaten metreye çevrilip orijine taşındı. */
  unitScale: number;
  rawUnit: string;
}

export type LayerMapping = Record<string, ElementType>;

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  height: number;
  thickness: number;
}

export interface WindowOpening {
  id: string;
  wallId: string;
  start: Point2D;
  end: Point2D;
  sillHeight: number; // parapet (m)
  headHeight: number; // cam üst kotu (m)
  transmittance: number; // cam görünür geçirgenliği τ (0..1)
}

export interface Door {
  id: string;
  wallId: string;
  start: Point2D;
  end: Point2D;
  height: number;
}

/** İç yüzey yansıtıcılıkları (0..1). */
export interface Material {
  ceiling: number;
  wall: number;
  floor: number;
}

export interface Room {
  id: string;
  outline: Point2D[]; // kapalı döngü, metre
  walls: Wall[];
  windows: WindowOpening[];
  doors: Door[];
  wallHeight: number; // m
  material: Material;
  maintenanceFactor: number; // MF (0..1)
  area: number; // m² (shoelace)
  workplaneHeight: number; // çalışma düzlemi yüksekliği (m)
}

export type FixtureKey =
  | "led_panel_60"
  | "downlight_18"
  | "linear_led_1200"
  | "spot_35";

export type LdcType = "cosine" | "spot";

export interface FixtureType {
  key: FixtureKey;
  name: string;
  lumens: number;
  power: number; // W (bilgi amaçlı)
  cct: number; // K
  beamAngle: number; // derece, tam açı
  ldc: LdcType;
}

export interface Fixture {
  id: string;
  typeKey: FixtureKey;
  /** Plan koordinatları (m); z = montaj yüksekliği. */
  position: Point3D;
  rotationDeg: number;
}

export type SkyModel = "clear" | "overcast";

export interface Location {
  lat: number;
  lng: number;
  label: string;
  date: string; // ISO yyyy-mm-dd
  timeMinutes: number; // 00:00'dan itibaren dakika
  buildingNorthDeg: number; // planın +Y ekseninin gerçek kuzeyden sapması
  skyModel: SkyModel;
}

export interface GridPoint {
  x: number;
  y: number;
  lux: number;
  daylightLux: number;
  artificialLux: number;
}

export interface SimulationResult {
  grid: GridPoint[];
  cols: number;
  rows: number;
  spacing: number;
  origin: Point2D; // ızgaranın sol-alt köşesi (m)
  avg: number;
  min: number;
  max: number;
  uniformityUo: number; // Emin / Eavg
  uniformityU1: number; // Emin / Emax
  daylightFactorPct: number;
  lumenMethodAvg: number; // analitik çapraz kontrol
  computedAt: number;
  durationMs: number;
}

export interface SimulationSettings {
  gridSpacing: number; // m
  raySamples: number; // gökyüzü örnek sayısı
  includeDaylight: boolean;
  includeArtificial: boolean;
}

export interface ProjectState {
  projectId: string;
  fileName: string | null;
  dxf: DxfDocument | null;
  layerMapping: LayerMapping;
  room: Room | null;
  fixtures: Fixture[];
  location: Location;
  settings: SimulationSettings;
}

/** Paylaşım linkine gömülen küçültülmüş proje (ham DXF entity'leri hariç). */
export interface SharedProject {
  fileName: string | null;
  room: Room | null;
  fixtures: Fixture[];
  location: Location;
  settings: SimulationSettings;
  result: SimulationResult | null;
}
