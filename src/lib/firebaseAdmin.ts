// src/lib/firebaseAdmin.ts

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { RoadList, SerializableRoadList } from '@/types/roadList';
import { SerializableVehicle, VehicleConfig } from '@/types/vehicle';
import { adminConverter } from "@/lib/converter";
import { adminVehicleConverter, toSerializableVehicle } from '@/lib/vehicleConverter';
import {getAuth, UserRecord} from "firebase-admin/auth";

/**
 * Rebuild the PEM from whatever a deployment platform did to it.
 *
 * The key only ever travels as a single environment variable, and the line
 * breaks rarely survive the trip: a dashboard field can fold them into spaces
 * or drop them, and a value copied out of .env.example keeps its wrapping
 * quotes. None of that is visible at startup, because cert() only checks that
 * the key is a string - the first thing to notice is OpenSSL failing to decode
 * it, much later, on the first call that needs an access token.
 *
 * So take the base64 body, ignore whatever separated it, and lay it back out
 * the way OpenSSL expects.
 */
function normalizePrivateKey(raw: string | undefined): string | undefined {
    if (!raw) return raw;

    const key = raw.replace(/\\n/g, "\n").trim().replace(/^["']|["']$/g, "");
    const match = key.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);

    if (!match) return key;

    const [, label, body] = match;
    const lines = body.replace(/\s+/g, "").match(/.{1,64}/g) ?? [];

    return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

const app = !getApps().length
    ? initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
        storageBucket: 'scuderia-docs'
    })
    : getApps()[0];

export const adminDb = getFirestore();

export const adminAuth = getAuth(app);

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

export async function getAllVehiclesServer(db: Firestore = adminDb): Promise<SerializableVehicle[]> {
    try {
        console.time('Firestore vehicles query');
        const snapshot = await db
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

export async function getAllRoadListsServer(db: Firestore = adminDb): Promise<SerializableRoadList[]> {
    try {
        // First fetch vehicles to pass to converter
        console.time('Fetch vehicles for roadlist conversion');
        const vehiclesSnapshot = await db
            .collection('vehicles')
            .withConverter(adminVehicleConverter)
            .get();
        const vehicleConfigs: VehicleConfig[] = vehiclesSnapshot.docs.map(doc => doc.data());
        console.timeEnd('Fetch vehicles for roadlist conversion');

        console.time('Firestore roadlists query');
        const snapshot = await db
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

export async function getAllUsers() {
    const users: UserRecord[] = [];
    async function listAllUsers(nextPageToken?: string) {
        try {
            const listUsersResult = await adminAuth.listUsers(1000, nextPageToken);
            users.push(...listUsersResult.users);
            // listUsersResult.users.forEach((userRecord) => {
            //     console.log(`User: ${userRecord.uid}, Email: ${userRecord.email}`);
            //     // Access other user properties like displayName, photoURL, etc.
            // });

            if (listUsersResult.pageToken) {
                // Recursively fetch the next batch
                await listAllUsers(listUsersResult.pageToken);
            }
        } catch (error) {
            console.error('Error listing users:', error);
        }
    }

    // Start listing users from the beginning
    await listAllUsers();

    return users;
}

export async function getUser(uid: string): Promise<UserRecord> {
    return adminAuth.getUser(uid);
}

// export async function upsertVehicle(db: Firestore = adminDb): Promise<SerializableVehicle> {
//     const collection = adminDb.collection('vehicles').withConverter(new VehicleConverter());
//     const doc = typeof data.id === 'string' && await collection.doc(data.id).get();
//
//     if (typeof data.id === 'string' && doc && doc.exists) {
//         const now = new Date();
//         await collection.doc(data.id).set({
//             ...data,
//             updatedAt: now,
//         }, { merge: true });
//     } else {
//         const now = new Date();
//         await collection.add({
//             ...data,
//             id: data.name,
//             createdAt: now,
//             updatedAt: now,
//         });
//     }
// }