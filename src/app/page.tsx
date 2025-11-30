// src/app/page.tsx

import { getAllRoadListsServer, getAllVehiclesServer } from '@/lib/firebaseAdmin';
import StoreProvider from '@/components/StoreProvider';
import VehicleStoreProvider from '@/components/VehicleStoreProvider';
import RoadLists from '@/components/RoadLists';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
    const [initialRoadLists, initialVehicles] = await Promise.all([
        getAllRoadListsServer(),
        getAllVehiclesServer(),
    ]);

    return (
        <VehicleStoreProvider initialVehicles={initialVehicles}>
            <StoreProvider initialRoadLists={initialRoadLists}>
                <RoadLists />
            </StoreProvider>
        </VehicleStoreProvider>
    );
}