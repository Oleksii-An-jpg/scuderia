import { initializeApp } from "firebase/app";
import {
    collection,
    DocumentReference,
    getFirestore,
    doc,
    setDoc,
    addDoc,
    WithFieldValue,
    DocumentData,
    QueryDocumentSnapshot,
    SnapshotOptions,
    getDocs,
    getDoc,
    deleteDoc,
    query,
    orderBy, Timestamp,
} from "firebase/firestore";

const app = initializeApp({
    projectId: "cookbook-460911",
    apiKey: "AIzaSyDjgyzE4AUL_ssOkL791sUBNNBnelljXpM",
});

export enum Vehicle {
    KMAR = "Kmar",
    MAMBA = "Mamba",
}

export type BaseItinerary = {
    date: string;
    br: number | null;
    fuel: number | null;
};

export type Itinerary<T extends BaseItinerary> = T;

export type RoadList<T extends BaseItinerary = BaseItinerary> = {
    itineraries: Itinerary<T>[];
    id?: string;
    start: Date;
    end: Date;
    vehicle: Vehicle;
    fuel: number;
};

export type RoadListFS<T extends BaseItinerary = BaseItinerary> = Omit<RoadList<T>, 'start' | 'end'> & {
    start: Timestamp;
    end: Timestamp;
}

export const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
}

const roadListConverter = {
    toFirestore(roadList: RoadList): DocumentData {
        const start = new Date(roadList.itineraries[0].date);
        const end = new Date(roadList.itineraries[roadList.itineraries.length - 1].date);
        return {
            ...roadList,
            start,
            end,
        };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<RoadListFS>, options: SnapshotOptions): RoadList {
        const data = snapshot.data(options);

        return {
            ...data,
            id: snapshot.id,
            start: data.start.toDate(),
            end: data.end.toDate(),
        };
    },
};

export const db = getFirestore(app);
export const roadListsRef = collection(db, "road-lists").withConverter(roadListConverter);

export async function upsertDoc(
    data: WithFieldValue<RoadList>,
    id?: string
): Promise<DocumentReference<RoadList>> {
    if (id) {
        const docRef = doc(roadListsRef, id);
        await setDoc(docRef, data, { merge: true });
        return docRef;
    } else {
        return addDoc(roadListsRef, data);
    }
}

export async function deleteDocById(id: string) {
    const docRef = doc(roadListsRef, id);
    await deleteDoc(docRef);
}

export async function getDocById(id: string) {
    const docRef = doc(roadListsRef, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
        return { success: false, error: "No such document!" };
    }
}

// Optimized query with proper sorting by latestDate
export async function getAllRoadLists() {
    try {
        const q = query(roadListsRef, orderBy('end', 'desc'));
        const querySnapshot = await getDocs(q);
        return { success: true, data: querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            })) };
    } catch (error) {
        console.error("Error fetching road lists:", error);
        return { success: false, error: error };
    }
}