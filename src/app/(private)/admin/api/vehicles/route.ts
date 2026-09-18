import { NextRequest, NextResponse } from 'next/server';
import {FirestoreVehicle, VehicleConfig} from "@/types/vehicle";
import {firestoreToVehicle, vehicleToFirestore} from "@/lib/vehicleConverter";
import {QueryDocumentSnapshot, FirestoreDataConverter, Timestamp} from "firebase-admin/firestore";
import {setup} from "@/lib/subdomain";
import {authorizeAdminRequest} from "@/lib/auth";

class VehicleConverter implements FirestoreDataConverter<VehicleConfig> {
    toFirestore(vehicle: VehicleConfig): FirestoreVehicle<Timestamp> {
        return vehicleToFirestore(vehicle);
    }

    fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreVehicle>): VehicleConfig {
        return firestoreToVehicle(snapshot.data(), snapshot.id);
    }
}

export async function POST(request: NextRequest) {
    const auth = await authorizeAdminRequest();
    if (!auth.ok) return auth.response;

    let data: VehicleConfig;

    try {
        data = await request.json();
    } catch {
        return NextResponse.json({ error: 'Malformed JSON body' }, { status: 400 });
    }

    // The id becomes a document path, so a value containing a slash would write
    // somewhere other than the vehicles collection.
    if (typeof data?.id !== 'string' || data.id.length === 0 || data.id.includes('/')) {
        return NextResponse.json(
            { error: 'id is required and must not contain "/"' },
            { status: 400 },
        );
    }

    const db = await setup();

    if (!db) {
        return NextResponse.json({ error: 'Database is unavailable' }, { status: 503 });
    }
    const collection = db.collection('vehicles').withConverter(new VehicleConverter());
    const doc = await collection.doc(data.id).get();

    if (doc.exists) {
        const now = new Date();
        await collection.doc(data.id).set({
            ...data,
            updatedAt: now,
        }, { merge: true });
    } else {
        const now = new Date();
        await collection.doc(data.id).set({
            ...data,
            createdAt: now,
            updatedAt: now,
        });
    }

    return NextResponse.json({ success: true, data });
}
