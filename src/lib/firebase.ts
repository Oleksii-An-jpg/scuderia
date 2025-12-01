// src/lib/firebase.ts

'use client';
import { initializeApp, getApps } from 'firebase/app';
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
    Firestore,
} from 'firebase/firestore';
import { RoadList, FirestoreRoadList, EngineHours } from '@/types/roadList';
import { Vehicle, VehicleConfig } from '@/types/vehicle';
import { firestoreToRoadList, roadListToFirestore } from "@/lib/converter";
import { uploadDocToBucket } from "@/lib/storage";
import { useVehicleStore } from '@/lib/vehicleStore';
import {getAuth} from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Lazy database initialization based on subdomain
let db: Firestore | null = null;

export { getDb as db };

function getDb(): Firestore {
    if (!db) {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            if (parts.length > 1) {
                const [subdomain] = parts;
                // Use subdomain as database ID for Firebase multi-database
                db = getFirestore(app, subdomain);
            } else {
                db = getFirestore(app);
            }
        } else {
            // SSR fallback - use default database
            db = getFirestore(app);
        }
    }
    return db;
}

export const auth = getAuth(app);

// Firestore converter - needs vehicle configs
const createRoadListConverter = (vehicleConfigs: VehicleConfig[]): FirestoreDataConverter<RoadList> => ({
    toFirestore(roadList: RoadList): DocumentData {
        return roadListToFirestore(roadList);
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreRoadList>): RoadList {
        const data = snapshot.data();
        return firestoreToRoadList(data, snapshot.id, vehicleConfigs);
    },
});

function getRoadListsRef() {
    return collection(getDb(), 'road-lists');
}

export async function getAllRoadLists(): Promise<RoadList[]> {
    const vehicleConfigs = useVehicleStore.getState().vehicles;
    const converter = createRoadListConverter(vehicleConfigs);
    const roadListsWithConverter = getRoadListsRef().withConverter(converter);

    const q = query(roadListsWithConverter, orderBy('end', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}

export async function upsertRoadList(
    rl: RoadList,
    vehicle: Vehicle,
    allRoadLists: RoadList[]
): Promise<void> {
    const vehicleConfigs = useVehicleStore.getState().vehicles;
    const converter = createRoadListConverter(vehicleConfigs);
    const roadListsWithConverter = getRoadListsRef().withConverter(converter);

    const batch = writeBatch(getDb());
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
        const docRef = doc(roadListsWithConverter, roadList.id);
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
                const vehicleConfig = vehicleConfigs.find(v => v.id === vehicle);
                if (!vehicleConfig) throw new Error(`Vehicle config not found: ${vehicle}`);

                const prevCalculated = calculateRoadList(prev, vehicleConfig);

                const updated = {
                    ...current,
                    startHours: prevCalculated.cumulativeHours,
                    startFuel: prevCalculated.cumulativeFuel,
                };

                vehicleRoadLists[i] = updated;
                const currentDocRef = doc(roadListsWithConverter, current.id!);
                batch.set(currentDocRef, updated);
            }
        }
    } else {
        // Create new
        const newDocRef = doc(roadListsWithConverter);
        batch.set(newDocRef, { ...roadList, id: newDocRef.id });
    }

    try {
        await batch.commit();
        await Promise.all(
            rl.itineraries
                .map(it => it.docs?.filter(doc => doc instanceof File))
                .flat()
                .filter(doc => !!doc)
                .map(uploadDocToBucket)
        );
    } catch (e) {
        console.error(e);
    }
}

export async function deleteRoadList(
    id: string,
    vehicle: Vehicle,
    allRoadLists: RoadList[]
): Promise<void> {
    const vehicleConfigs = useVehicleStore.getState().vehicles;
    const converter = createRoadListConverter(vehicleConfigs);
    const roadListsWithConverter = getRoadListsRef().withConverter(converter);

    const batch = writeBatch(getDb());
    const docRef = doc(roadListsWithConverter, id);

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
        let startFuel: number;

        if (deletedIndex > 0) {
            const { calculateRoadList } = await import('./calculations');
            const vehicleConfig = vehicleConfigs.find(v => v.id === vehicle);
            if (!vehicleConfig) throw new Error(`Vehicle config not found: ${vehicle}`);

            const prevCalculated = calculateRoadList(vehicleRoadLists[deletedIndex - 1], vehicleConfig);
            startHours = prevCalculated.cumulativeHours;
            startFuel = prevCalculated.cumulativeFuel;
        } else {
            // First record was deleted, use current record's original values
            startHours = current.startHours;
            startFuel = current.startFuel;
        }

        const updated = { ...current, startHours, startFuel };
        const currentDocRef = doc(roadListsWithConverter, current.id!);
        batch.set(currentDocRef, updated);
    }

    await batch.commit();
}