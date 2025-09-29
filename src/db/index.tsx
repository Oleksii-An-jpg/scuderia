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
    CollectionReference,
} from "firebase/firestore";
import {
    Converter,
    RoadListModel,
    Vehicle,
    MambaAppModelType,
    KMARAppModelType,
    MambaDBModelType,
    KMARDBModelType
} from "@/models";

const app = initializeApp({
    projectId: "cookbook-460911",
    apiKey: "AIzaSyDjgyzE4AUL_ssOkL791sUBNNBnelljXpM",
});

export { Vehicle };

export const db = getFirestore(app);

type AppModelType = MambaAppModelType | KMARAppModelType;
type DBModelType = MambaDBModelType | KMARDBModelType;

export const roadListsRef = collection(db, "road-lists").withConverter(
    new Converter<AppModelType, DBModelType>()
) as CollectionReference<AppModelType, DBModelType>;

export async function upsertDoc(
    data: WithFieldValue<AppModelType>,
    id?: string
): Promise<DocumentReference<AppModelType, DBModelType>> {
    if (id) {
        const docRef = doc(roadListsRef, id);
        await setDoc(docRef, data, { merge: true });
        return docRef;
    } else {
        return addDoc(roadListsRef, data);
    }
}

export async function getAllRoadListsNext() {
    const q = query(roadListsRef, orderBy('end', 'asc'));
    const querySnapshot = await getDocs(q);
    return new RoadListModel(querySnapshot);
}