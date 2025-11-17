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
    Vehicle, MambaRoadListAppModel, KMARRoadListAppModel, F250RoadListAppModel, MasterRoadListAppModel, AppType
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
    data: WithFieldValue<AppType>,
    id?: string
): Promise<DocumentReference<AppType>> {
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
        } as (MambaRoadListAppModel | KMARRoadListAppModel | F250RoadListAppModel | MasterRoadListAppModel);

        const batch = writeBatch(db);

        // First, write the updated record itself
        batch.set(docRef, data, { merge: true });

        // Then recalculate subsequent records
        for (let i = updatedIndex + 1; i < roadLists.length; i++) {
            const currentRoadList = roadLists[i];

            // Get the ending values from the previous record
            const prevRoadList = roadLists[i - 1];
            const prevCalculated = calculateCumulative(prevRoadList);

            // Store only the input values with updated start values
            const currentDocRef = doc(roadListsRef, currentRoadList.id);
            batch.set(currentDocRef, {
                ...currentRoadList,
                startHours: prevCalculated.cumulativeHours,
                startFuel: prevCalculated.cumulativeFuel,
            }, { merge: true });

            // Update in-memory array
            roadLists[i] = calculateCumulative({
                ...currentRoadList,
                startHours: prevCalculated.cumulativeHours,
                startFuel: prevCalculated.cumulativeFuel,
            });
        }

        await batch.commit();
        return docRef;
    } else {
        return addDoc(roadListsRef, data);
    }
}

export class RoadListStore {
    private records: Map<string, AppType>;

    constructor(snapshot: QuerySnapshot<AppType>) {
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

export async function deleteDoc(id: string, vehicle: Vehicle): Promise<void> {
    const docRef = doc(roadListsRef, id);
    const store = await getAllRoadListsNext();
    const roadLists = store.getByVehicle(vehicle);

    // Find the record to delete
    const deletedIndex = roadLists.findIndex(rl => rl.id === id);

    if (deletedIndex === -1) {
        throw new Error(`RoadList with id ${id} not found`);
    }

    const batch = writeBatch(db);

    // Delete the record
    batch.delete(docRef);

    // Recalculate subsequent records
    for (let i = deletedIndex + 1; i < roadLists.length; i++) {
        const currentRoadList = roadLists[i];

        // Get the ending values from the previous record (or initial values if this is now the first)
        let prevCumulativeHours: number;
        let prevCumulativeFuel: number;

        if (deletedIndex > 0) {
            // Use the record before the deleted one
            const prevRoadList = roadLists[deletedIndex - 1];
            const prevCalculated = calculateCumulative(prevRoadList);
            prevCumulativeHours = prevCalculated.cumulativeHours;
            prevCumulativeFuel = prevCalculated.cumulativeFuel;
        } else {
            // The deleted record was first, so the next record becomes first
            // Use the first remaining record's original start values
            prevCumulativeHours = roadLists[i].startHours;
            prevCumulativeFuel = roadLists[i].startFuel;
        }

        // Store only the input values with updated start values
        const currentDocRef = doc(roadListsRef, currentRoadList.id);
        batch.set(currentDocRef, {
            ...currentRoadList,
            startHours: prevCumulativeHours,
            startFuel: prevCumulativeFuel,
        }, { merge: true });
    }

    await batch.commit();
}

export async function getAllRoadListsNext() {
    const q = query(roadListsRef, orderBy('end', 'asc'));
    const querySnapshot = await getDocs(q);
    return new RoadListStore(querySnapshot);
}