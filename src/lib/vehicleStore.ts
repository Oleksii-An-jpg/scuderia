// src/lib/vehicleStore.ts

import { create } from 'zustand';
import { VehicleConfig } from '@/types/vehicle';

type VehicleStoreState = {
    vehicles: VehicleConfig[];
    activeVehicles: VehicleConfig[]; // Cached active vehicles
}

type VehicleStoreActions = {
    hydrate: (vehicles: VehicleConfig[]) => void;
}

// Selector functions outside the store to avoid hydration issues
export const selectVehicleById = (state: VehicleStoreState, id: string) => {
    return state.vehicles.find(v => v.id === id);
};

export const useVehicleStore = create<VehicleStoreState & VehicleStoreActions>((set) => ({
    vehicles: [],
    activeVehicles: [],

    hydrate: (vehicles: VehicleConfig[]) => {
        const activeVehicles = vehicles.filter(v => v.active);
        set({ vehicles, activeVehicles });
    },
}));