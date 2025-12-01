// src/app/page.tsx

import { getAllRoadListsServer, getAllVehiclesServer } from '@/lib/firebaseAdmin';
import StoreProvider from '@/components/StoreProvider';
import VehicleStoreProvider from '@/components/VehicleStoreProvider';
import RoadLists from '@/components/RoadLists';
import {setup} from "@/lib/subdomain";

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

    return (
        <VehicleStoreProvider initialVehicles={initialVehicles}>
            <StoreProvider initialRoadLists={initialRoadLists} vehicle={vehicle}>
                <RoadLists />
            </StoreProvider>
        </VehicleStoreProvider>
    );
}