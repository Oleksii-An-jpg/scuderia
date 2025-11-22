'use client';
import { useRef, ReactNode } from 'react';
import { useStore } from '@/lib/store';
import {Itinerary, RoadList, SerializableRoadList} from '@/types/roadList';

type Props = {
    initialRoadLists: SerializableRoadList[];
    children: ReactNode;
};

// Convert serializable format back to RoadList with Date objects
function deserializeRoadList(serializable: SerializableRoadList): RoadList {
    return {
        ...serializable,
        start: new Date(serializable.start),
        end: new Date(serializable.end),
        itineraries: serializable.itineraries.map(it => {
            // Preserve all properties from the itinerary
            const converted: Itinerary = {
                br: it.br ? Number(it.br) : null,
                fuel: it.fuel ? Number(it.fuel) : null,
                comment: it.comment ? String(it.comment) : undefined,
                date: new Date(it.date),
            };
            for (const key in it) {
                if (key === 'date') {
                    converted.date = new Date(it.date);
                } else {
                    converted[key] = it[key];
                }
            }
            return converted;
        }),
    };
}

export default function StoreProvider({ initialRoadLists, children }: Props) {
    const initialized = useRef(false);

    // Hydrate store synchronously before render
    if (!initialized.current) {
        const roadLists = initialRoadLists.map(deserializeRoadList);
        useStore.getState().hydrate(roadLists);
        initialized.current = true;
    }

    return <>{children}</>;
}