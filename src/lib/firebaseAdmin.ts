// src/lib/firebaseAdmin.ts

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { RoadList, SerializableRoadList } from '@/types/roadList';
import { SerializableVehicle, VehicleConfig } from '@/types/vehicle';
import { adminConverter } from "@/lib/converter";
import { adminVehicleConverter, toSerializableVehicle } from '@/lib/vehicleConverter';

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

export async function getAllVehiclesServer(): Promise<SerializableVehicle[]> {
    try {
        console.time('Firestore vehicles query');
        const snapshot = await adminDb
            .collection('vehicles')
            .withConverter(adminVehicleConverter)
            .where('active', '==', true)
            .get();
        console.timeEnd('Firestore vehicles query');

        console.time('Convert vehicle documents');
        const vehicles = snapshot.docs.map(doc => doc.data());
        console.timeEnd('Convert vehicle documents');

        console.time('Serialize vehicles for client');
        const serialized = vehicles.map(toSerializableVehicle);
        console.timeEnd('Serialize vehicles for client');

        return serialized;
    } catch (error) {
        console.error('Error fetching vehicles from Firestore:', error);
        throw error;
    }
}

export async function getAllRoadListsServer(): Promise<SerializableRoadList[]> {
    try {
        // First fetch vehicles to pass to converter
        console.time('Fetch vehicles for roadlist conversion');
        const vehiclesSnapshot = await adminDb
            .collection('vehicles')
            .withConverter(adminVehicleConverter)
            .get();
        const vehicleConfigs: VehicleConfig[] = vehiclesSnapshot.docs.map(doc => doc.data());
        console.timeEnd('Fetch vehicles for roadlist conversion');

        console.time('Firestore roadlists query');
        const snapshot = await adminDb
            .collection('road-lists')
            .withConverter(adminConverter(vehicleConfigs))
            .orderBy('end', 'asc')
            .get();
        console.timeEnd('Firestore roadlists query');

        console.time('Convert roadlist documents');
        const roadLists = snapshot.docs.map(doc => doc.data());
        console.timeEnd('Convert roadlist documents');

        console.time('Serialize roadlists for client');
        const serialized = roadLists.map(toSerializable);
        console.timeEnd('Serialize roadlists for client');

        return serialized;
    } catch (error) {
        console.error('Error fetching from Firestore:', error);
        throw error;
    }
}