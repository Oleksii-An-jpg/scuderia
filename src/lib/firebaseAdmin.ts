import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {RoadList, SerializableRoadList} from '@/types/roadList';
import {adminConverter} from "@/lib/converter";

// Initialize Firebase Admin (only once)
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        storageBucket: 'scuderia-docs'
    });
}

const adminDb = getFirestore();

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
        console.time('Firestore query');
        const snapshot = await adminDb
            .collection('road-lists')
            .withConverter(adminConverter)
            .orderBy('end', 'asc')
            .get();
        console.timeEnd('Firestore query');

        console.time('Convert documents');
        const roadLists = snapshot.docs.map(doc =>
            doc.data()
        );
        console.timeEnd('Convert documents');

        console.time('Serialize for client');
        const serialized = roadLists.map(toSerializable);
        console.timeEnd('Serialize for client');

        return serialized;
    } catch (error) {
        console.error('Error fetching from Firestore:', error);
        throw error;
    }
}