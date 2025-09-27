import { initializeApp } from "firebase/app";
import {
    collection,
    DocumentReference,
    getFirestore,
    doc,
    setDoc,
    addDoc,
    WithFieldValue,
    getDocs,
    query,
    orderBy,
} from "firebase/firestore";
import {MambaAppModelType, MambaConverter, RoadListModel} from "@/models";

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

export const db = getFirestore(app);
export const roadListsRef = collection(db, "road-lists").withConverter(new MambaConverter());

export async function upsertDoc(
    data: WithFieldValue<MambaAppModelType>,
    id?: string
): Promise<DocumentReference<MambaAppModelType>> {
    if (id) {
        const docRef = doc(roadListsRef, id);
        await setDoc(docRef, data, { merge: true });
        return docRef;
    } else {
        return addDoc(roadListsRef, data);
    }
}

export async function getAllRoadListsNext() {
    const q = query(roadListsRef, orderBy('end', 'desc'));
    const querySnapshot = await getDocs(q);
    return new RoadListModel(querySnapshot);
}