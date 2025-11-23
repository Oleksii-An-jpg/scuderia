import { RoadList, FirestoreRoadList } from '@/types/roadList';
import {Timestamp} from "firebase/firestore";
import {QueryDocumentSnapshot} from "firebase-admin/firestore";
import {isBoat} from "@/types/vehicle";

// Shared conversion logic
export function firestoreToRoadList(data: FirestoreRoadList, id: string): RoadList {
    return {
        vehicle: data.vehicle,
        roadListID: data.roadListID,
        startFuel: data.startFuel,
        startHours: typeof data.startHours === 'object' ? data.startHours : isBoat(data.vehicle) ? {
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
        })),
    };
}

export const adminConverter = {
    fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreRoadList>): RoadList {
        const data = snapshot.data();
        return firestoreToRoadList(data, snapshot.id);
    },
    toFirestore(roadList: RoadList): FirebaseFirestore.DocumentData {
        // Not needed for read operation
        throw new Error('toFirestore not implemented');
    }
}