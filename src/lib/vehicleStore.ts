// src/lib/vehicleStore.ts

import { create } from 'zustand';
import { VehicleConfig } from '@/types/vehicle';

type VehicleStoreState = {
    vehicles: VehicleConfig[];
    activeVehicles: VehicleConfig[]; // Cached active vehicles
    initialized: boolean; // Track if store has been hydrated
}

type VehicleStoreActions = {
    hydrate: (vehicles: VehicleConfig[]) => void;
}

// Selector functions outside the store to avoid hydration issues
export const selectVehicleById = (state: VehicleStoreState, id: string) => {
    const config = state.vehicles.find(v => v.id === id);

    if (!config) {
        throw new Error('vehicles not found');
    }

    return config;
};

export const useVehicleStore = create<VehicleStoreState & VehicleStoreActions>((set) => ({
    vehicles: [],
    activeVehicles: [],
    initialized: false,

    hydrate: (vehicles: VehicleConfig[]) => {
        const activeVehicles = vehicles.filter(v => v.active);
        set({ vehicles, activeVehicles, initialized: true });
    },
}));