'use client';
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
} from 'firebase/firestore';
import {RoadList, FirestoreRoadList, EngineHours} from '@/types/roadList';
import { Vehicle } from '@/types/vehicle';
import {firestoreToRoadList, roadListToFirestore} from "@/lib/converter";
import {uploadDocToBucket} from "@/lib/storage";

const app = initializeApp({
    projectId: 'cookbook-460911',
    apiKey: 'AIzaSyDjgyzE4AUL_ssOkL791sUBNNBnelljXpM',
});

export const db = getFirestore(app);

// Firestore converter
export const roadListConverter: FirestoreDataConverter<RoadList> = {
    toFirestore(roadList: RoadList): DocumentData {
        return roadListToFirestore(roadList);
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreRoadList>): RoadList {
        const data = snapshot.data();
        return firestoreToRoadList(data, snapshot.id);
    },
};

export const roadListsRef = collection(db, 'road-lists').withConverter(roadListConverter);

export async function getAllRoadLists(): Promise<RoadList[]> {
    const q = query(roadListsRef, orderBy('end', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}

export async function upsertRoadList(
    rl: RoadList,
    vehicle: Vehicle,
    allRoadLists: RoadList[]
): Promise<void> {
    const batch = writeBatch(db);
    const roadList = {
        ...rl,
        itineraries: rl.itineraries.map(it => ({
            ...it,
            docs: it.docs?.map(doc => {
                if (typeof doc === 'string') {
                    return doc;
                }

                return doc.name
            })
        }))
    }

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

    try {
        await batch.commit();
        await Promise.all(rl.itineraries.map(it => it.docs?.filter(doc => doc instanceof File)).flat().filter(doc => !!doc).map(uploadDocToBucket))
    } catch (e) {
        console.error(e);
    }
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

        let startHours: EngineHours | number;
        let startFuel: EngineHours | number;

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