import { NextRequest, NextResponse } from 'next/server';
import {FirestoreVehicle, VehicleConfig} from "@/types/vehicle";
import {firestoreToVehicle, vehicleToFirestore} from "@/lib/vehicleConverter";
import {QueryDocumentSnapshot, FirestoreDataConverter, Timestamp} from "firebase-admin/firestore";
import {setup} from "@/lib/subdomain";

class VehicleConverter implements FirestoreDataConverter<VehicleConfig> {
    toFirestore(vehicle: VehicleConfig): FirestoreVehicle<Timestamp> {
        return vehicleToFirestore(vehicle);
    }

    fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreVehicle>): VehicleConfig {
        return firestoreToVehicle(snapshot.data(), snapshot.id);
    }
}

export async function POST(request: NextRequest) {
    const data: VehicleConfig = await request.json();
    const db = await setup();

    if (!db) {
        throw new Error('DB is missing');
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
