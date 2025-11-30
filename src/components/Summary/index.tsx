// src/components/Summary/index.tsx

'use client';
import { FC, memo, useMemo } from 'react';
import { GridItem, Heading } from '@chakra-ui/react';
import { CalculatedRoadList } from '@/types/roadList';
import { Vehicle, getModes, isBoat } from '@/types/vehicle';
import {selectVehicleById, useVehicleStore} from '@/lib/vehicleStore';
import { decimalToTimeString } from '@/lib/timeUtils';

type Props = {
    calculated: CalculatedRoadList;
    vehicle: Vehicle;
}

const Summary: FC<Props> = ({ calculated, vehicle }) => {
    const vehicleConfig = useVehicleStore(state => selectVehicleById(state, vehicle));
    if (!vehicleConfig) return null;

    const modes = getModes(vehicleConfig);

    const modeTotals = useMemo(() => {
        const totals: Record<string, number> = {};

        modes.forEach(mode => {
            totals[mode.id] = calculated.itineraries.reduce((sum, it) => {
                // @ts-expect-error: dynamic key
                return sum + ((it[mode.id] as number) || 0);
            }, 0);
        });

        return totals;
    }, [calculated.itineraries, modes]);

    return (
        <>
            {/* Label at the 3rd column (after date, br, fuel) */}
            <GridItem colStart={3}>
                <Heading size="sm">Разом:</Heading>
            </GridItem>

            {/* Mode totals */}
            {modes.map(mode => (
                <GridItem key={mode.id}>
                    <Heading textStyle="sm">
                        {isBoat(vehicleConfig)
                            ? decimalToTimeString(modeTotals[mode.id])
                            : Math.round(modeTotals[mode.id])
                        }
                    </Heading>
                </GridItem>
            ))}

            {/* Total hours/km */}
            <GridItem>
                <Heading textStyle="sm">
                    {isBoat(vehicleConfig)
                        ? decimalToTimeString(calculated.hours)
                        : Math.round(calculated.hours)
                    }
                </Heading>
            </GridItem>

            {/* Total fuel */}
            <GridItem>
                <Heading textStyle="sm">
                    {Math.round(calculated.fuel)}
                </Heading>
            </GridItem>
        </>
    );
};

export default memo(Summary);