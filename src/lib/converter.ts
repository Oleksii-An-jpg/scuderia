// src/lib/converter.ts

import { RoadList, FirestoreRoadList } from '@/types/roadList';
import {Timestamp} from "firebase/firestore";
import {QueryDocumentSnapshot} from "firebase-admin/firestore";
import { VehicleConfig } from '@/types/vehicle';

// Shared conversion logic
export function firestoreToRoadList(data: FirestoreRoadList, id: string, vehicleConfigs: VehicleConfig[]): RoadList {
    // Find vehicle config to determine if it's a boat
    const vehicleConfig = vehicleConfigs.find(v => v.id === data.vehicle);
    const isBoat = vehicleConfig?.type === 'boat';

    return {
        vehicle: data.vehicle,
        roadListID: data.roadListID,
        startFuel: data.startFuel,
        startHours: typeof data.startHours === 'object' ? data.startHours : isBoat ? {
            left: data.startHours,
            right: data.startHours,
        } : data.startHours,
        id,
        start: data.start.toDate(),
        end: data.end.toDate(),
        itineraries: data.itineraries.map(it => {
            return {
                ...it,
                date: it.date.toDate(),
            }
        }),
    };
}

export function roadListToFirestore(roadList: RoadList) {
    return {
        vehicle: roadList.vehicle,
        roadListID: roadList.roadListID,
        startFuel: roadList.startFuel,
        startHours: roadList.startHours,
        start: Timestamp.fromDate(roadList.start),
        end: Timestamp.fromDate(roadList.end),
        itineraries: roadList.itineraries.map(it => ({
            ...it,
            date: Timestamp.fromDate(it.date),
            docs: it.docs ? it.docs : [],
        })),
    };
}

export const adminConverter = (vehicleConfigs: VehicleConfig[]) => ({
    fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreRoadList>): RoadList {
        const data = snapshot.data();
        return firestoreToRoadList(data, snapshot.id, vehicleConfigs);
    },
    toFirestore(roadList: RoadList): FirebaseFirestore.DocumentData {
        // Not needed for read operation
        throw new Error('toFirestore not implemented');
    }
});