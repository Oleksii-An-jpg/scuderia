import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    writeBatch,
    query,
    orderBy,
    DocumentData,
    QueryDocumentSnapshot,
    FirestoreDataConverter,
    Timestamp,
} from 'firebase/firestore';
import {RoadList, FirestoreRoadList, Itinerary} from '@/types/roadList';
import { Vehicle } from '@/types/vehicle';

const app = initializeApp({
    projectId: 'cookbook-460911',
    apiKey: 'AIzaSyDjgyzE4AUL_ssOkL791sUBNNBnelljXpM',
});

export const db = getFirestore(app);

// Helper to convert Firestore timestamp to Date
function toDate(value: Timestamp | Date | { toDate(): Date }): Date {
    if (value instanceof Timestamp) {
        return value.toDate();
    }
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        return value.toDate();
    }
    return value as unknown as Date;
}

// Firestore converter
const roadListConverter: FirestoreDataConverter<RoadList> = {
    toFirestore(roadList: RoadList): DocumentData {
        return {
            ...roadList,
            start: Timestamp.fromDate(roadList.start),
            end: Timestamp.fromDate(roadList.end),
            itineraries: roadList.itineraries.map(it => ({
                ...it,
                date: Timestamp.fromDate(it.date),
            })),
        };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): RoadList {
        const data = snapshot.data() as FirestoreRoadList;
        return {
            vehicle: data.vehicle,
            roadListID: data.roadListID,
            startFuel: data.startFuel,
            startHours: data.startHours,
            id: snapshot.id,
            start: toDate(data.start),
            end: toDate(data.end),
            itineraries: data.itineraries.map(it => {
                // Preserve all properties from the itinerary
                const converted: Itinerary = {
                    br: it.br ? Number(it.br) : null,
                    fuel: it.fuel ? Number(it.fuel) : null,
                    comment: it.comment ? String(it.comment) : undefined,
                    date: toDate(it.date),
                };
                for (const key in it) {
                    if (key === 'date') {
                        converted.date = toDate(it.date);
                    } else {
                        converted[key] = it[key];
                    }
                }
                return converted;
            }),
        };
    },
};

export const roadListsRef = collection(db, 'road-lists').withConverter(roadListConverter);

export async function getAllRoadLists(): Promise<RoadList[]> {
    const q = query(roadListsRef, orderBy('end', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}

export async function upsertRoadList(
    roadList: RoadList,
    vehicle: Vehicle,
    allRoadLists: RoadList[]
): Promise<void> {
    const batch = writeBatch(db);

    // Find all roadlists for this vehicle, sorted by date
    const vehicleRoadLists = allRoadLists
        .filter(rl => rl.vehicle === vehicle)
        .sort((a, b) => a.end.getTime() - b.end.getTime());

    if (roadList.id) {
        // Update existing
        const docRef = doc(roadListsRef, roadList.id);
        batch.set(docRef, roadList);

        // Find index and recalculate subsequent ones
        const index = vehicleRoadLists.findIndex(rl => rl.id === roadList.id);
        if (index !== -1) {
            vehicleRoadLists[index] = roadList;

            // Recalculate all following roadlists
            for (let i = index + 1; i < vehicleRoadLists.length; i++) {
                const prev = vehicleRoadLists[i - 1];
                const current = vehicleRoadLists[i];

                // Calculate previous to get ending values
                const { calculateRoadList } = await import('./calculations');
                const prevCalculated = calculateRoadList(prev);

                const updated = {
                    ...current,
                    startHours: prevCalculated.cumulativeHours,
                    startFuel: prevCalculated.cumulativeFuel,
                };

                vehicleRoadLists[i] = updated;
                const currentDocRef = doc(roadListsRef, current.id!);
                batch.set(currentDocRef, updated);
            }
        }
    } else {
        // Create new
        const newDocRef = doc(roadListsRef);
        batch.set(newDocRef, { ...roadList, id: newDocRef.id });
    }

    await batch.commit();
}

export async function deleteRoadList(
    id: string,
    vehicle: Vehicle,
    allRoadLists: RoadList[]
): Promise<void> {
    const batch = writeBatch(db);
    const docRef = doc(roadListsRef, id);

    const vehicleRoadLists = allRoadLists
        .filter(rl => rl.vehicle === vehicle)
        .sort((a, b) => a.end.getTime() - b.end.getTime());

    const deletedIndex = vehicleRoadLists.findIndex(rl => rl.id === id);

    if (deletedIndex === -1) {
        throw new Error(`RoadList with id ${id} not found`);
    }

    batch.delete(docRef);

    // Recalculate subsequent records
    for (let i = deletedIndex + 1; i < vehicleRoadLists.length; i++) {
        const current = vehicleRoadLists[i];

        let startHours: number;
        let startFuel: number;

        if (deletedIndex > 0) {
            const { calculateRoadList } = await import('./calculations');
            const prevCalculated = calculateRoadList(vehicleRoadLists[deletedIndex - 1]);
            startHours = prevCalculated.cumulativeHours;
            startFuel = prevCalculated.cumulativeFuel;
        } else {
            // First record was deleted, use current record's original values
            startHours = current.startHours;
            startFuel = current.startFuel;
        }

        const updated = { ...current, startHours, startFuel };
        const currentDocRef = doc(roadListsRef, current.id!);
        batch.set(currentDocRef, updated);
    }

    await batch.commit();
}