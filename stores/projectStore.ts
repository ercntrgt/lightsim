"use client";

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type {
  DxfDocument,
  ElementType,
  FloorRegion,
  Fixture,
  FixtureKey,
  Location,
  ManualElements,
  Point2D,
  ProjectState,
  Room,
  SimulationSettings,
} from "@/types";
import { autoClassify } from "@/lib/dxf/classifier";
import { rescaleDxf } from "@/lib/dxf/parser";
import {
  buildRoom,
  applyRoomParams,
  applyManual,
  detectFloors,
  extractFixturePositions,
  DEFAULT_ROOM_PARAMS,
  type BuildOpts,
  type RoomParams,
} from "@/lib/dxf/extruder";

const emptyManual = (): ManualElements => ({
  walls: [],
  windows: [],
  doors: [],
});

let _mid = 0;
const mid = (pfx: string) =>
  `m${pfx}${(++_mid).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Noktanın segmente uzaklığı (manuel eleman silme isabeti için). */
function segDist(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// localStorage'ı kota hatasına karşı korur — QuotaExceededError uygulamayı
// çökertmemeli (büyük DXF'lerde olabilir; ham DXF zaten persist edilmiyor).
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* QuotaExceededError vb. — sessizce yoksay */
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* yoksay */
    }
  },
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export const DEFAULT_LOCATION: Location = {
  lat: 41.0082,
  lng: 28.9784,
  label: "İstanbul",
  date: todayISO(),
  timeMinutes: 12 * 60,
  buildingNorthDeg: 0,
  skyModel: "clear",
};

export const DEFAULT_SETTINGS: SimulationSettings = {
  gridSpacing: 0.4,
  raySamples: 400,
  includeDaylight: true,
  includeArtificial: true,
};

interface ProjectActions {
  roomParams: RoomParams;
  /** Gizli (3D/türetmeden hariç) katman adları. */
  hiddenLayers: string[];
  /** Çoklu kat tespitinde bulunan bölgeler. */
  floors: FloorRegion[];
  selectedFloorId: string | null;
  /** Kullanıcının elle çizdiği duvar/pencere/kapı segmentleri. */
  manual: ManualElements;
  setDxf: (fileName: string, dxf: DxfDocument) => void;
  setLayerType: (layer: string, type: ElementType) => void;
  /** Yükleme sonrası DXF birimini değiştirir; varsa odayı yeniden kurar. */
  setDxfUnit: (insCode: number) => void;
  toggleLayerHidden: (layer: string) => void;
  selectFloor: (id: string | null) => void;
  addManualSeg: (
    kind: "wall" | "window" | "door",
    start: Point2D,
    end: Point2D
  ) => void;
  /** Verilen noktaya en yakın manuel elemanı siler (varsa). */
  removeManualNear: (p: Point2D, maxDist?: number) => void;
  clearManual: () => void;
  buildRoomFromDxf: () => void;
  /** "fixture" katmanından armatür konumlarını çıkarıp yerleştirir. Adet döner. */
  placeFixturesFromDxf: (typeKey: FixtureKey) => number;
  setRoomParams: (p: Partial<RoomParams>) => void;
  addFixture: (f: Fixture) => void;
  moveFixture: (id: string, x: number, y: number) => void;
  removeFixture: (id: string) => void;
  setLocation: (p: Partial<Location>) => void;
  setSettings: (p: Partial<SimulationSettings>) => void;
  loadShared: (room: Room, fixtures: Fixture[], location: Location, settings: SimulationSettings) => void;
  reset: () => void;
}

type Store = ProjectState & ProjectActions;

const blank = (): ProjectState => ({
  projectId: Math.random().toString(36).slice(2, 10),
  fileName: null,
  dxf: null,
  layerMapping: {},
  room: null,
  fixtures: [],
  location: { ...DEFAULT_LOCATION },
  settings: { ...DEFAULT_SETTINGS },
});

export const useProjectStore = create<Store>()(
  persist(
    (set, get) => {
      const optsOf = (): BuildOpts => {
        const s = get();
        return {
          hidden: new Set(s.hiddenLayers),
          floor:
            s.floors.find((f) => f.id === s.selectedFloorId)?.bbox ?? null,
        };
      };

      // Oda'yı yeniden türetir: DXF varsa sıfırdan kurar, sonra manuel
      // elemanları ekler. DXF yoksa (yeniden yükleme) mevcut odadan
      // manuelleri ayıklayıp güncel manuel listesiyle yeniden ekler.
      const recompute = () => {
        const { dxf, layerMapping, roomParams, room, manual } = get();
        if (dxf) {
          const r = applyManual(
            buildRoom(dxf, layerMapping, roomParams, optsOf()),
            manual,
            roomParams
          );
          set({ room: r });
          return;
        }
        if (!room) return;
        const ids = new Set<string>([
          ...manual.walls.map((m) => m.id),
          ...manual.windows.map((m) => m.id),
          ...manual.doors.map((m) => m.id),
        ]);
        const base: Room = {
          ...room,
          walls: room.walls.filter((w) => !ids.has(w.id)),
          windows: room.windows.filter((w) => !ids.has(w.id)),
          doors: room.doors.filter((d) => !ids.has(d.id)),
        };
        set({ room: applyManual(base, manual, roomParams) });
      };

      return {
      ...blank(),
      roomParams: { ...DEFAULT_ROOM_PARAMS },
      hiddenLayers: [],
      floors: [],
      selectedFloorId: null,
      manual: emptyManual(),

      setDxf: (fileName, dxf) =>
        set({
          fileName,
          dxf,
          layerMapping: autoClassify(dxf.layers),
          room: null,
          hiddenLayers: [],
          floors: [],
          selectedFloorId: null,
          manual: emptyManual(),
        }),

      setLayerType: (layer, type) =>
        set((s) => ({ layerMapping: { ...s.layerMapping, [layer]: type } })),

      setDxfUnit: (insCode) => {
        const { dxf, room } = get();
        if (!dxf || dxf.insCode === insCode) return;
        set({ dxf: rescaleDxf(dxf, insCode) });
        if (room) recompute();
      },

      toggleLayerHidden: (layer) => {
        set((s) => ({
          hiddenLayers: s.hiddenLayers.includes(layer)
            ? s.hiddenLayers.filter((l) => l !== layer)
            : [...s.hiddenLayers, layer],
        }));
        if (get().room) recompute();
      },

      selectFloor: (id) => {
        set({ selectedFloorId: id });
        if (get().room) recompute();
      },

      addManualSeg: (kind, start, end) => {
        if (Math.hypot(end.x - start.x, end.y - start.y) < 1e-3) return;
        const seg = { id: mid(kind[0]), start, end };
        set((s) => {
          const key = (`${kind}s` as "walls" | "windows" | "doors");
          return { manual: { ...s.manual, [key]: [...s.manual[key], seg] } };
        });
        recompute();
      },

      removeManualNear: (p, maxDist = 0.6) => {
        const { manual } = get();
        let bestId: string | null = null;
        let bestD = maxDist;
        const scan = (segs: { id: string; start: Point2D; end: Point2D }[]) => {
          for (const m of segs) {
            const d = segDist(p, m.start, m.end);
            if (d < bestD) {
              bestD = d;
              bestId = m.id;
            }
          }
        };
        scan(manual.walls);
        scan(manual.windows);
        scan(manual.doors);
        if (!bestId) return;
        set((s) => ({
          manual: {
            walls: s.manual.walls.filter((m) => m.id !== bestId),
            windows: s.manual.windows.filter((m) => m.id !== bestId),
            doors: s.manual.doors.filter((m) => m.id !== bestId),
          },
        }));
        recompute();
      },

      clearManual: () => {
        set({ manual: emptyManual() });
        recompute();
      },

      buildRoomFromDxf: () => {
        const { dxf, layerMapping, hiddenLayers, selectedFloorId } = get();
        if (!dxf) return;
        const floors = detectFloors(
          dxf,
          layerMapping,
          new Set(hiddenLayers)
        );
        const selId =
          floors.length > 1
            ? (floors.some((f) => f.id === selectedFloorId)
                ? selectedFloorId
                : floors[0].id)
            : null;
        set({ floors, selectedFloorId: selId });
        recompute();
      },

      placeFixturesFromDxf: (typeKey) => {
        const { dxf, layerMapping, roomParams, fixtures } = get();
        if (!dxf) return 0;
        const pts = extractFixturePositions(
          dxf,
          layerMapping,
          0.4,
          optsOf()
        );
        // Önceki DXF kaynaklı armatürleri (id "dxf" ile başlayan) değiştir,
        // elle yerleştirilenleri ("fx") koru.
        const manual = fixtures.filter((f) => !f.id.startsWith("dxf"));
        const fromDxf: Fixture[] = pts.map((p, i) => ({
          id: `dxf${i}-${Math.random().toString(36).slice(2, 6)}`,
          typeKey,
          position: { x: p.x, y: p.y, z: roomParams.wallHeight },
          rotationDeg: 0,
        }));
        set({ fixtures: [...manual, ...fromDxf] });
        return fromDxf.length;
      },

      setRoomParams: (p) =>
        set((s) => {
          const roomParams = { ...s.roomParams, ...p };
          return {
            roomParams,
            room: s.room ? applyRoomParams(s.room, roomParams) : s.room,
          };
        }),

      addFixture: (f) => set((s) => ({ fixtures: [...s.fixtures, f] })),
      moveFixture: (id, x, y) =>
        set((s) => ({
          fixtures: s.fixtures.map((f) =>
            f.id === id ? { ...f, position: { ...f.position, x, y } } : f
          ),
        })),
      removeFixture: (id) =>
        set((s) => ({ fixtures: s.fixtures.filter((f) => f.id !== id) })),

      setLocation: (p) =>
        set((s) => ({ location: { ...s.location, ...p } })),
      setSettings: (p) =>
        set((s) => ({ settings: { ...s.settings, ...p } })),

      loadShared: (room, fixtures, location, settings) =>
        set({
          room,
          fixtures,
          location,
          settings,
          dxf: null,
          hiddenLayers: [],
          floors: [],
          selectedFloorId: null,
          manual: emptyManual(),
        }),

      reset: () =>
        set({
          ...blank(),
          roomParams: { ...DEFAULT_ROOM_PARAMS },
          hiddenLayers: [],
          floors: [],
          selectedFloorId: null,
          manual: emptyManual(),
        }),
      };
    },
    {
      name: "lightsim-project",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? safeStorage : noopStorage
      ),
      // Ham DXF (tüm entity'ler) PERSIST EDİLMEZ — localStorage kotasını aşar.
      // Türetilmiş `room` saklanır; simülasyon/3D yeniden yüklemede çalışır,
      // 2D plan için DXF yeniden yüklenebilir.
      partialize: (s) => ({
        projectId: s.projectId,
        fileName: s.fileName,
        layerMapping: s.layerMapping,
        room: s.room,
        fixtures: s.fixtures,
        location: s.location,
        settings: s.settings,
        roomParams: s.roomParams,
        hiddenLayers: s.hiddenLayers,
        selectedFloorId: s.selectedFloorId,
        manual: s.manual,
      }),
    }
  )
);
