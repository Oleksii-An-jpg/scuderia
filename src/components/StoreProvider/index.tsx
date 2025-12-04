'use client';
import { useRef, ReactNode } from 'react';
import { useStore } from '@/lib/store';
import {RoadList, SerializableRoadList} from '@/types/roadList';

type Props = {
    initialRoadLists: SerializableRoadList[];
    vehicle?: string;
    children: ReactNode;
};

// Convert serializable format back to RoadList with Date objects
function deserializeRoadList(serializable: SerializableRoadList): RoadList {
    return {
        ...serializable,
        start: new Date(serializable.start),
        end: new Date(serializable.end),
        itineraries: serializable.itineraries.map(it => {
            return {
                ...it,
                date: new Date(it.date),
            }
        }),
    };
}

export default function StoreProvider({ initialRoadLists, vehicle, children }: Props) {
    const initialized = useRef(false);

    // Hydrate store synchronously before render
    if (!initialized.current) {
        const roadLists = initialRoadLists.map(deserializeRoadList);
        useStore.getState().hydrate(roadLists, vehicle);
        initialized.current = true;
    }

    return <>{children}</>;
}