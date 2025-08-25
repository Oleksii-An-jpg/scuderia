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
    SnapshotOptions, getDocs, getDoc
} from "firebase/firestore";

const app = initializeApp({
    projectId: "cookbook-460911",
    apiKey: "AIzaSyDjgyzE4AUL_ssOkL791sUBNNBnelljXpM",
});

export type BaseRecord = {
    departure?: Date;
    arrival?: Date;
    fueling?: number;
    br?: number;
    remaining?: number;
};

export enum Vehicle {
    KMAR = "Kmar",
    MAMBA = "Mamba",
}

export type Record<T extends BaseRecord> = T;

export type RoadList<T extends BaseRecord = BaseRecord> = {
    vehicle: Vehicle;
    records: Record<T>[];
    id?: string
};

const roadListConverter = {
    toFirestore(roadList: RoadList): DocumentData {
        return { ...roadList };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<RoadList>, options: SnapshotOptions): RoadList {
        return snapshot.data(options);
    }
};

export const db = getFirestore(app);

export const roadListsRef = collection(db, "road-lists").withConverter(roadListConverter);

export async function upsertDoc(
    data: WithFieldValue<RoadList>,
    id?: string
): Promise<DocumentReference<RoadList>> {
    if (id) {
        // Fixed ID → upsert
        const docRef = doc(roadListsRef, id); // 👈 use the provided collectionRef
        await setDoc(docRef, data, { merge: true });
        return docRef;
    } else {
        return addDoc(roadListsRef, data);
    }
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

export async function getAllRoadLists() {
    try {
        const querySnapshot = await getDocs(roadListsRef);
        const roadLists: RoadList[] = [];

        querySnapshot.forEach((doc) => {
            roadLists.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return { success: true, data: roadLists };
    } catch (error) {
        return { success: false, error: error };
    }
}
