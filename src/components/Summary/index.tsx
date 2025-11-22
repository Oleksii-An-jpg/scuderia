'use client';
import { FC, memo, useMemo } from 'react';
import { GridItem, Heading } from '@chakra-ui/react';
import { CalculatedRoadList } from '@/types/roadList';
import { Vehicle, VEHICLE_CONFIG, isBoat } from '@/types/vehicle';
import { decimalToTimeString } from '@/lib/timeUtils';

type Props = {
    calculated: CalculatedRoadList;
    vehicle: Vehicle;
}

const Summary: FC<Props> = ({ calculated, vehicle }) => {
    const config = VEHICLE_CONFIG[vehicle];
    const modes = config.type === 'boat' ? config.speedModes : config.terrainModes;

    const modeTotals = useMemo(() => {
        const totals: Record<string, number> = {};

        modes.forEach(mode => {
            totals[mode] = calculated.itineraries.reduce((sum, it) => {
                return sum + ((it[mode] as number) || 0);
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
                <GridItem key={mode}>
                    <Heading textStyle="sm">
                        {isBoat(vehicle)
                            ? decimalToTimeString(modeTotals[mode])
                            : Math.round(modeTotals[mode])
                        }
                    </Heading>
                </GridItem>
            ))}

            {/* Total hours/km */}
            <GridItem>
                <Heading textStyle="sm">
                    {isBoat(vehicle)
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