import { RoadList, CalculatedRoadList, CalculatedItinerary, EngineHours } from '@/types/roadList';
import { VEHICLE_CONFIG, isBoat } from '@/types/vehicle';

export function calculateRoadList(
    roadList: RoadList,
    startFuel?: number,
    startHours?: EngineHours | number
): CalculatedRoadList {
    const config = VEHICLE_CONFIG[roadList.vehicle];
    let cumulativeHours: EngineHours | number = startHours ?? roadList.startHours;
    let cumulativeFuel = startFuel ?? roadList.startFuel;
    let cumulativeReceivedFuel = 0;

    const modes = config.type === 'boat' ? config.speedModes : config.terrainModes;

    const enhancedItineraries: CalculatedItinerary[] = roadList.itineraries.map(it => {
        let rowHours = 0;
        let rowConsumed = 0;

        // Calculate based on vehicle type
        modes.forEach(mode => {
            // @ts-expect-error: dynamic keys
            const value = (it[mode] as number) || 0;
            rowHours += value;
            rowConsumed += value * config.rates[mode];
        });

        // Round based on vehicle type
        rowHours = Math.round(rowHours * 100) / 100;
        rowConsumed = config.type === 'car'
            ? Math.round(rowConsumed * 100) / 100
            : Math.round(rowConsumed);

        // Update cumulative hours
        if (isBoat(roadList.vehicle) && typeof cumulativeHours === 'object') {
            // For boats: both engines accumulate the same rowHours
            cumulativeHours = {
                left: cumulativeHours.left + rowHours,
                right: cumulativeHours.right + rowHours,
            };
        } else if (typeof cumulativeHours === 'number') {
            // For cars: simple addition
            cumulativeHours += rowHours;
        }

        cumulativeFuel += (it.fuel || 0) - rowConsumed;
        cumulativeReceivedFuel += it.fuel || 0;

        return {
            ...it,
            rowHours,
            rowConsumed,
            cumulativeHours: typeof cumulativeHours === 'object'
                ? { ...cumulativeHours }
                : cumulativeHours,
            cumulativeFuel: Math.round(cumulativeFuel * 100) / 100,
        };
    });

    const totalHours = enhancedItineraries.reduce((sum, it) => sum + it.rowHours, 0);
    const totalFuel = enhancedItineraries.reduce((sum, it) => sum + it.rowConsumed, 0);

    return {
        ...roadList,
        itineraries: enhancedItineraries,
        hours: totalHours,
        fuel: totalFuel,
        cumulativeHours: typeof cumulativeHours === 'object'
            ? { ...cumulativeHours }
            : cumulativeHours,
        cumulativeFuel: Math.round(cumulativeFuel * 100) / 100,
        cumulativeReceivedFuel
    };
}

export function calculateRoadListChain(
    roadLists: RoadList[]
): CalculatedRoadList[] {
    const results: CalculatedRoadList[] = [];

    for (let i = 0; i < roadLists.length; i++) {
        const current = roadLists[i];

        // IMPORTANT: Use the stored startFuel and startHours from the roadlist itself
        // These values are already set correctly during upsert to match the previous roadlist's end values
        const startFuel = current.startFuel;
        const startHours = current.startHours;

        results.push(calculateRoadList(current, startFuel, startHours));
    }

    return results;
}