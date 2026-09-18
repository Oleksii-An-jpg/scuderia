'use client';
import { initializeApp, getApps } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    DocumentData,
    QueryDocumentSnapshot,
    FirestoreDataConverter,
    Firestore,
} from 'firebase/firestore';
import { RoadList, FirestoreRoadList } from '@/types/roadList';
import { VehicleConfig } from '@/types/vehicle';
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
            if (parts.length > 2) {
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

export function subscribeToRoadLists(
    onChange: (roadLists: RoadList[]) => void,
    onError?: (error: Error) => void
): () => void {
    const vehicleConfigs = useVehicleStore.getState().vehicles;
    const converter = createRoadListConverter(vehicleConfigs);
    const q = query(getRoadListsRef().withConverter(converter), orderBy('end', 'asc'));

    // The snapshot already carries every document, so hydrate straight from it
    // instead of paying for another full read of the collection.
    return onSnapshot(
        q,
        snapshot => onChange(snapshot.docs.map(doc => doc.data())),
        error => {
            console.error('Road list subscription failed:', error);
            onError?.(error);
        }
    );
}

/**
 * Writes a single road list. Cumulative fuel and engine hours are derived by
 * calculateRoadListChain rather than stored per document, so no other road list
 * needs rewriting when this one changes.
 */
export async function upsertRoadList(rl: RoadList): Promise<RoadList> {
    const vehicleConfigs = useVehicleStore.getState().vehicles;
    const converter = createRoadListConverter(vehicleConfigs);
    const roadListsWithConverter = getRoadListsRef().withConverter(converter);

    // Prepare roadList for saving (convert File objects to filenames)
    const roadList: RoadList = {
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

    const docRef = roadList.id
        ? doc(roadListsWithConverter, roadList.id)
        : doc(roadListsWithConverter);

    const saved: RoadList = { ...roadList, id: docRef.id };

    try {
        await setDoc(docRef, saved);

        // Upload files after a successful write
        await Promise.all(
            rl.itineraries
                .map(it => it.docs?.filter(doc => doc instanceof File))
                .flat()
                .filter(doc => !!doc)
                .map(uploadDocToBucket)
        );
    } catch (e) {
        console.error('Error upserting roadlist:', e);
        throw e;
    }

    return saved;
}

export async function deleteRoadList(id: string): Promise<void> {
    await deleteDoc(doc(getRoadListsRef(), id));
}
