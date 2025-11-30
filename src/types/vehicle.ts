// src/types/vehicle.ts

import { Timestamp } from "firebase/firestore";

// Vehicle is now just a string (vehicle ID from Firestore)
export type Vehicle = string;

export type VehicleType = 'boat' | 'car';
export type VehicleUnit = 'hours' | 'km';

export type VehicleMode = {
    id: string;
    label: string;
    rate: number;
    order: number;
}

export type VehicleConfig = {
    id: string;
    name: string;
    type: VehicleType;
    unit: VehicleUnit;
    modes: VehicleMode[];
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Firestore version
export type FirestoreVehicle = Omit<VehicleConfig, 'id' | 'createdAt' | 'updatedAt'> & {
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Serializable version for SSR
export type SerializableVehicle = Omit<VehicleConfig, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
}

// Helper functions
export function getModes(vehicle: VehicleConfig): VehicleMode[] {
    return [...vehicle.modes].sort((a, b) => a.order - b.order);
}

export function isBoat(vehicleOrConfig: Vehicle | VehicleConfig, configs?: VehicleConfig[]): boolean {
    if (typeof vehicleOrConfig === 'string') {
        // It's a vehicle ID, need configs
        if (!configs) throw new Error('Vehicle configs required when passing vehicle ID');
        const config = configs.find(c => c.id === vehicleOrConfig);
        return config?.type === 'boat';
    }
    return vehicleOrConfig.type === 'boat';
}

export function isCar(vehicleOrConfig: Vehicle | VehicleConfig, configs?: VehicleConfig[]): boolean {
    if (typeof vehicleOrConfig === 'string') {
        if (!configs) throw new Error('Vehicle configs required when passing vehicle ID');
        const config = configs.find(c => c.id === vehicleOrConfig);
        return config?.type === 'car';
    }
    return vehicleOrConfig.type === 'car';
}

export function getVehicleConfig(vehicleId: Vehicle, configs: VehicleConfig[]): VehicleConfig {
    const config = configs.find(c => c.id === vehicleId);
    if (!config) throw new Error(`Vehicle config not found for: ${vehicleId}`);
    return config;
}

// Legacy vehicle IDs (for migration reference)
export const LEGACY_VEHICLES = {
    MAMBA: 'mamba',
    KMAR: 'kmar',
    F250: 'f250',
    MASTER: 'master',
} as const;