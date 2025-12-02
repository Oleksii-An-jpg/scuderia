// src/lib/vehicleConverter.ts

import { VehicleConfig, FirestoreVehicle, SerializableVehicle } from '@/types/vehicle';
import { QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";

// Convert Firestore -> VehicleConfig
export function firestoreToVehicle(data: FirestoreVehicle, id: string): VehicleConfig {
    return {
        id,
        name: data.name,
        type: data.type,
        unit: data.unit,
        modes: data.modes,
        active: data.active,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
    };
}

// Convert VehicleConfig -> Firestore
export function vehicleToFirestore(vehicle: VehicleConfig): FirestoreVehicle<Timestamp> {
    return {
        name: vehicle.name,
        type: vehicle.type,
        unit: vehicle.unit,
        modes: vehicle.modes,
        active: vehicle.active,
        createdAt: Timestamp.fromDate(new Date(vehicle.createdAt)),
        updatedAt: Timestamp.fromDate(new Date(vehicle.updatedAt)),
    };
}

// Admin converter for server-side
export const adminVehicleConverter = {
    fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreVehicle>): VehicleConfig {
        const data = snapshot.data();
        return firestoreToVehicle(data, snapshot.id);
    },
    toFirestore(vehicle: VehicleConfig): FirebaseFirestore.DocumentData {
        throw new Error('toFirestore not implemented for admin');
    }
};

// Convert VehicleConfig -> Serializable
export function toSerializableVehicle(vehicle: VehicleConfig): SerializableVehicle {
    return {
        ...vehicle,
        createdAt: vehicle.createdAt.toISOString(),
        updatedAt: vehicle.updatedAt.toISOString(),
    };
}

// Convert Serializable -> VehicleConfig
export function deserializeVehicle(serializable: SerializableVehicle): VehicleConfig {
    return {
        ...serializable,
        createdAt: new Date(serializable.createdAt),
        updatedAt: new Date(serializable.updatedAt),
    };
}