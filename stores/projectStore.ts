"use client";

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type {
  DxfDocument,
  ElementType,
  Fixture,
  FixtureKey,
  Location,
  ProjectState,
  Room,
  SimulationSettings,
} from "@/types";
import { autoClassify } from "@/lib/dxf/classifier";
import {
  buildRoom,
  applyRoomParams,
  extractFixturePositions,
  DEFAULT_ROOM_PARAMS,
  type RoomParams,
} from "@/lib/dxf/extruder";

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
  setDxf: (fileName: string, dxf: DxfDocument) => void;
  setLayerType: (layer: string, type: ElementType) => void;
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
    (set, get) => ({
      ...blank(),
      roomParams: { ...DEFAULT_ROOM_PARAMS },

      setDxf: (fileName, dxf) =>
        set({
          fileName,
          dxf,
          layerMapping: autoClassify(dxf.layers),
          room: null,
        }),

      setLayerType: (layer, type) =>
        set((s) => ({ layerMapping: { ...s.layerMapping, [layer]: type } })),

      buildRoomFromDxf: () => {
        const { dxf, layerMapping, roomParams } = get();
        if (!dxf) return;
        set({ room: buildRoom(dxf, layerMapping, roomParams) });
      },

      placeFixturesFromDxf: (typeKey) => {
        const { dxf, layerMapping, roomParams, fixtures } = get();
        if (!dxf) return 0;
        const pts = extractFixturePositions(dxf, layerMapping);
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
        set({ room, fixtures, location, settings, dxf: null }),

      reset: () => set({ ...blank(), roomParams: { ...DEFAULT_ROOM_PARAMS } }),
    }),
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
      }),
    }
  )
);
