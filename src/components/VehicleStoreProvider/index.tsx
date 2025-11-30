// src/components/VehicleStoreProvider/index.tsx

'use client';
import { useRef, ReactNode } from 'react';
import { useVehicleStore } from '@/lib/vehicleStore';
import { SerializableVehicle, VehicleConfig } from '@/types/vehicle';
import { deserializeVehicle } from '@/lib/vehicleConverter';

type Props = {
    initialVehicles: SerializableVehicle[];
    children: ReactNode;
};

export default function VehicleStoreProvider({ initialVehicles, children }: Props) {
    const initialized = useRef(false);

    if (!initialized.current) {
        const vehicles: VehicleConfig[] = initialVehicles.map(deserializeVehicle);
        useVehicleStore.getState().hydrate(vehicles);
        initialized.current = true;
    }

    return <>{children}</>;
}