// src/lib/store.ts

import { create } from 'zustand';
import { RoadList, CalculatedRoadList } from '@/types/roadList';
import { Vehicle, VehicleConfig } from '@/types/vehicle';
import { getAllRoadLists, upsertRoadList, deleteRoadList } from '@/lib/firebase';
import { calculateRoadListChain } from '@/lib/calculations';
import { useVehicleStore } from '@/lib/vehicleStore';

type StoreState = {
    roadLists: RoadList[];
    loading: boolean;
    selectedVehicle: Vehicle | null;
    // Cache for calculated results per vehicle
    calculatedCache: Record<Vehicle, CalculatedRoadList[]>;
}

type StoreActions = {
    fetchAll: () => Promise<void>;
    hydrate: (roadLists: RoadList[], vehicle?: string) => void;
    upsert: (roadList: RoadList) => Promise<void>;
    delete: (id: string, vehicle: Vehicle) => Promise<void>;
    setSelectedVehicle: (vehicle: Vehicle) => void;

    // Selectors
    getByVehicle: (vehicle: Vehicle) => CalculatedRoadList[];
    getById: (id: string) => RoadList | undefined;
}

function calculateAllCaches(roadLists: RoadList[], vehicleConfigs: VehicleConfig[]): Record<Vehicle, CalculatedRoadList[]> {
    const result: Record<Vehicle, CalculatedRoadList[]> = {};

    vehicleConfigs.forEach(vehicleConfig => {
        const vehicleRoadLists = roadLists
            .filter(rl => {
                return rl.vehicle === vehicleConfig.id
            })
            .sort((a, b) => a.end.getTime() - b.end.getTime());

        result[vehicleConfig.id] = calculateRoadListChain(vehicleRoadLists, vehicleConfigs);
    });

    return result;
}

export const useStore = create<StoreState & StoreActions>((set, get) => ({
    roadLists: [],
    loading: false,
    selectedVehicle: null,
    calculatedCache: {},

    fetchAll: async () => {
        set({ loading: true });
        try {
            const roadLists = await getAllRoadLists();
            get().hydrate(roadLists);
            set({ loading: false });
        } catch (error) {
            console.error('Error fetching road lists:', error);
            set({ loading: false });
        }
    },

    hydrate: (roadLists: RoadList[], vehicle) => {
        const vehicleConfigs = useVehicleStore.getState().vehicles;
        const calculatedCache = calculateAllCaches(roadLists, vehicleConfigs);

        // Set first available vehicle as selected if none selected
        const selectedVehicle = get().selectedVehicle || vehicle || vehicleConfigs[0]?.id || null;

        set({ roadLists, calculatedCache, selectedVehicle });
    },

    upsert: async (roadList) => {
        set({ loading: true });
        try {
            const allRoadLists = get().roadLists;
            await upsertRoadList(roadList, roadList.vehicle, allRoadLists);
            await get().fetchAll();
        } catch (error) {
            console.error('Error upserting road list:', error);
            set({ loading: false });
        }
    },

    delete: async (id, vehicle) => {
        set({ loading: true });
        try {
            const allRoadLists = get().roadLists;
            await deleteRoadList(id, vehicle, allRoadLists);
            await get().fetchAll();
        } catch (error) {
            console.error('Error deleting road list:', error);
            set({ loading: false });
        }
    },

    setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

    getByVehicle: (vehicle) => {
        return get().calculatedCache[vehicle] || [];
    },

    getById: (id) => {
        return get().roadLists.find(rl => rl.id === id);
    },
}));