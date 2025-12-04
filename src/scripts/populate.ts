// scripts/populateVehicles.ts
// Run this script once to populate the vehicles collection in Firestore
// Usage: npx tsx scripts/populateVehicles.ts

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
}

const db = getFirestore();

const vehicles = [
    {
        id: 'Mamba',
        name: 'Mamba',
        type: 'boat',
        unit: 'hours',
        active: true,
        modes: [
            { id: 'hh', label: 'ХХ', rate: 6.3, order: 0 },
            { id: 'mh', label: 'МХ', rate: 31.2, order: 1 },
            { id: 'sh', label: 'СХ', rate: 137, order: 2 },
            { id: 'ph', label: 'ПХ', rate: 253, order: 3 },
        ],
    },
    {
        id: 'KMAR',
        name: 'KMAR',
        type: 'boat',
        unit: 'hours',
        active: true,
        modes: [
            { id: 'hh', label: 'ХХ', rate: 5.5, order: 0 },
            { id: 'mh', label: 'МХ', rate: 54.7, order: 1 },
            { id: 'sh', label: 'СХ', rate: 199, order: 2 },
        ],
    },
    {
        id: 'F250',
        name: 'Ford F250',
        type: 'car',
        unit: 'km',
        active: true,
        modes: [
            { id: 't', label: 'Траса', rate: 0.229, order: 0 },
            { id: '5%', label: '5%', rate: 0.283, order: 1 },
            { id: '10%', label: '10%', rate: 0.297, order: 2 },
            { id: '15%', label: '15%', rate: 0.31, order: 3 },
            { id: '4x4', label: '4x4', rate: 0.337, order: 4 },
        ],
    },
    {
        id: 'Master',
        name: 'Renault Master',
        type: 'car',
        unit: 'km',
        active: true,
        modes: [
            { id: 't', label: 'Траса', rate: 0.102, order: 0 },
            { id: '5%', label: '5%', rate: 0.126, order: 1 },
            { id: '10%', label: '10%', rate: 0.132, order: 2 },
            { id: '15%', label: '15%', rate: 0.138, order: 3 },
            { id: '4x4', label: '4x4', rate: 0.23, order: 4 },
        ],
    },
];

export async function populateVehicles() {
    console.log('🚗 Starting vehicle population...\n');

    const now = Timestamp.now();
    const batch = db.batch();
    let createdCount = 0;

    for (const vehicle of vehicles) {
        // Generate new document reference (auto-generated ID)
        const docRef = db.collection('vehicles').doc(vehicle.id);

        // Add to batch
        batch.set(docRef, {
            ...vehicle,
            createdAt: now,
            updatedAt: now,
        });

        console.log(`✅ Queued vehicle: ${vehicle.name} (ID: ${docRef.id})`);
        console.log(`   Type: ${vehicle.type}`);
        console.log(`   Modes: ${vehicle.modes.map(m => m.label).join(', ')}`);
        console.log('');
        createdCount++;
    }

    // Commit batch
    try {
        await batch.commit();
        console.log('🎉 Successfully populated vehicles collection!');
        console.log(`\n📊 Total vehicles created: ${createdCount}`);
    } catch (error) {
        console.error('❌ Error populating vehicles:', error);
        throw error;
    }
}