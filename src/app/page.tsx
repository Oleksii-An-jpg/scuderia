'use server';
import { getAllRoadListsServer } from '@/lib/firebaseAdmin';
import StoreProvider from '@/components/StoreProvider';
import RoadLists from '@/components/RoadLists';

export default async function Page() {
    const initialRoadLists = await getAllRoadListsServer();

    return (
        <StoreProvider initialRoadLists={initialRoadLists}>
            <RoadLists />
        </StoreProvider>
    );
}
