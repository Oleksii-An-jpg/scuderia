import { initializeApp } from "firebase/app";
import {
    collection,
    getFirestore,
    getDocs,
    query,
    doc,
    setDoc,
    addDoc,
    orderBy, WithFieldValue, DocumentReference,
} from "firebase/firestore";
import {
    Converter,
    Vehicle, MambaRoadListAppModel, KMARRoadListAppModel
} from "@/models/mamba";
import {QuerySnapshot} from "@firebase/firestore";

const app = initializeApp({
    projectId: "cookbook-460911",
    apiKey: "AIzaSyDjgyzE4AUL_ssOkL791sUBNNBnelljXpM",
});

export const db = getFirestore(app);

export const roadListsRef = collection(db, "road-lists").withConverter(
    new Converter()
);

export async function upsertDoc(
    data: WithFieldValue<MambaRoadListAppModel | KMARRoadListAppModel>,
    id?: string
): Promise<DocumentReference<MambaRoadListAppModel | KMARRoadListAppModel>> {
    if (id) {
        const docRef = doc(roadListsRef, id);
        await setDoc(docRef, data, { merge: true });
        return docRef;
    } else {
        return addDoc(roadListsRef, data);
    }
}

export class RoadListStore {
    private records: Map<string, MambaRoadListAppModel | KMARRoadListAppModel>;

    constructor(snapshot: QuerySnapshot<MambaRoadListAppModel | KMARRoadListAppModel>) {
        this.records = new Map(
            snapshot.docs.map(doc => [doc.id, doc.data()])
        );
    }

    getByVehicle(vehicle: Vehicle) {
        return Array.from(this.records.values())
            .filter(r => r.vehicle === vehicle)
            .sort((a, b) => a.end.getTime() - b.end.getTime());
    }

    getById(id: string) {
        return this.records.get(id);
    }
}

export async function getAllRoadListsNext() {
    const q = query(roadListsRef, orderBy('end', 'asc'));
    const querySnapshot = await getDocs(q);
    return new RoadListStore(querySnapshot);
}