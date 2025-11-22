import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {Itinerary, RoadList, SerializableRoadList} from '@/types/roadList';

// Initialize Firebase Admin (only once)
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
}

const adminDb = getFirestore();

function firestoreToRoadList(doc: FirebaseFirestore.DocumentSnapshot): RoadList {
    const data = doc.data() as unknown as RoadList;

    return {
        vehicle: data.vehicle,
        roadListID: data.roadListID,
        startFuel: data.startFuel,
        startHours: data.startHours,
        id: doc.id,
        start: data.start instanceof Timestamp ? data.start.toDate() : new Date(data.start),
        end: data.end instanceof Timestamp ? data.end.toDate() : new Date(data.end),
        itineraries: data.itineraries.map((it) => {
            const converted: Itinerary = {
                br: it.br ? Number(it.br) : null,
                fuel: it.fuel ? Number(it.fuel) : null,
                comment: it.comment ? String(it.comment) : undefined,
                date: it.date instanceof Timestamp ? it.date.toDate() : new Date(it.date),
            };
            for (const key in it) {
                if (key === 'date') {
                    converted.date = it.date instanceof Timestamp ? it.date.toDate() : new Date(it.date);
                } else {
                    converted[key] = it[key];
                }
            }
            return converted;
        }),
    };
}

// Convert RoadList to serializable format (Dates -> ISO strings)
function toSerializable(roadList: RoadList): SerializableRoadList {
    return {
        ...roadList,
        start: roadList.start.toISOString(),
        end: roadList.end.toISOString(),
        itineraries: roadList.itineraries.map(it => ({
            ...it,
            date: it.date.toISOString(),
        })),
    };
}

export async function getAllRoadListsServer(): Promise<SerializableRoadList[]> {
    try {
        const snapshot = await adminDb
            .collection('road-lists')
            .orderBy('end', 'asc')
            .get();

        const roadLists = snapshot.docs.map(firestoreToRoadList);
        return roadLists.map(toSerializable);
    } catch (error) {
        console.error('Error fetching from Firestore:', error);
        throw error;
    }
}