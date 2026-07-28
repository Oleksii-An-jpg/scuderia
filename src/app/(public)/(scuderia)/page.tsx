// src/app/page.tsx

import {adminAuth, getAllRoadListsServer, getAllVehiclesServer, getUser} from '@/lib/firebaseAdmin';
import StoreProvider from '@/components/StoreProvider';
import VehicleStoreProvider from '@/components/VehicleStoreProvider';
import RoadLists from '@/components/RoadLists';
import {setup} from "@/lib/subdomain";
import {cookies} from "next/headers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({
                                       searchParams,
                                   }: {
    searchParams: Promise<{
        vehicle?: string;
    }>
}) {
    const db = await setup();
    const vehicle = (await searchParams).vehicle;
    const [initialRoadLists, initialVehicles] = await Promise.all([
        getAllRoadListsServer(db),
        getAllVehiclesServer(db),
    ]);
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    let role : string | undefined;

    if (sessionCookie) {
        try {
            const decoded = await adminAuth.verifySessionCookie(sessionCookie.value, true);

            if (decoded.role == null) {
                const user = await getUser(decoded.uid);
                if (user.customClaims?.role != null) {
                    role = user.customClaims?.role;
                }
            } else {
                role = decoded.role
            }
        } catch {
            console.error('Could not verify session');
        }
    }

    return (
        <VehicleStoreProvider initialVehicles={initialVehicles}>
            <StoreProvider initialRoadLists={initialRoadLists} vehicle={vehicle}>
                <RoadLists role={role} />
            </StoreProvider>
        </VehicleStoreProvider>
    );
}