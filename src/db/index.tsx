import { initializeApp } from "firebase/app";
import {
    collection,
    getFirestore,
    getDocs,
    query,
    doc,
    addDoc,
    writeBatch,
    orderBy, WithFieldValue, DocumentReference,
} from "firebase/firestore";
import {
    Converter,
    Vehicle, MambaRoadListAppModel, KMARRoadListAppModel
} from "@/models/mamba";
import {QuerySnapshot} from "@firebase/firestore";
import {calculateCumulative} from "@/calculator";

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
        const store = await getAllRoadListsNext();
        const vehicle = data.vehicle as Vehicle;
        const roadLists = store.getByVehicle(vehicle);

        // Find and update the modified record
        const updatedIndex = roadLists.findIndex(rl => rl.id === id);
        roadLists[updatedIndex] = {
            ...roadLists[updatedIndex],
            ...data,
            id,
            vehicle
        } as (MambaRoadListAppModel | KMARRoadListAppModel);

        const batch = writeBatch(db);

        // Start with the values from the previous record (before the updated one)
        let prevCumulativeHours: number;
        let prevCumulativeFuel: number;

        if (updatedIndex > 0) {
            // Calculate the previous record to get its ending values
            const prevRoadList = roadLists[updatedIndex - 1];
            const prevCalculated = calculateCumulative(prevRoadList);
            prevCumulativeHours = prevCalculated.cumulativeHours;
            prevCumulativeFuel = prevCalculated.cumulativeFuel;
        } else {
            // First record uses its own start values
            prevCumulativeHours = roadLists[0].startHours;
            prevCumulativeFuel = roadLists[0].startFuel;
        }

        // Recalculate from the updated record onwards
        for (let i = updatedIndex; i < roadLists.length; i++) {
            const currentRoadList = roadLists[i];

            // Use the accumulated values from the previous iteration
            const recalculated = calculateCumulative({
                ...currentRoadList,
                startHours: prevCumulativeHours,
                startFuel: prevCumulativeFuel,
            });

            // Store only the input values
            const docRef = doc(roadListsRef, currentRoadList.id);
            batch.set(docRef, {
                ...currentRoadList,
                startHours: prevCumulativeHours,
                startFuel: prevCumulativeFuel,
            }, { merge: true });

            // Update for next iteration
            prevCumulativeHours = recalculated.cumulativeHours;
            prevCumulativeFuel = recalculated.cumulativeFuel;

            // Update in-memory array
            roadLists[i] = recalculated;
        }

        await batch.commit();
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