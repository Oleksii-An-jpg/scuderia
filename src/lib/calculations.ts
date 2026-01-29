// src/lib/calculations.ts

import { RoadList, CalculatedRoadList, CalculatedItinerary, EngineHours } from '@/types/roadList';
import { VehicleConfig, getModes, isBoat } from '@/types/vehicle';

export function calculateRoadList(
    roadList: RoadList,
    vehicleConfig: VehicleConfig,
    startFuel?: number,
    startHours?: EngineHours | number,
    startMaintenanceHours?: EngineHours | number,
    startMaintenanceFuel?: number,
    hasMaintenanceRecords?: boolean
): CalculatedRoadList {
    let cumulativeHours: EngineHours | number = startHours ?? roadList.startHours;
    let cumulativeFuel = startFuel ?? roadList.startFuel;
    let cumulativeReceivedFuel = 0;
    let cumulativeHoursFromRecentMaintenance: EngineHours | number = startMaintenanceHours ?? (isBoat(vehicleConfig) ? { left: 0, right: 0 } : 0);
    let cumulativeFuelFromRecentMaintenance = startMaintenanceFuel ?? 0;
    let hasMaintenanceRecordsFlag = hasMaintenanceRecords ?? false;

    const modes = getModes(vehicleConfig);

    const enhancedItineraries: CalculatedItinerary[] = roadList.itineraries.map(it => {
        let rowHours = 0;
        let rowConsumed = 0;

        // Calculate based on vehicle type
        modes.forEach(mode => {
            // @ts-expect-error: dynamic keys
            const value = (it[mode.id] as number) || 0;
            rowHours += value;
            rowConsumed += value * mode.rate;
        });

        // Round based on vehicle type
        rowHours = Math.round(rowHours * 100) / 100;
        rowConsumed = vehicleConfig.type === 'car'
            ? Math.round(rowConsumed * 100) / 100
            : Math.round(rowConsumed);

        // Update cumulative hours
        if (isBoat(vehicleConfig) && typeof cumulativeHours === 'object') {
            // For boats: both engines accumulate the same rowHours
            cumulativeHours = {
                left: Math.round((cumulativeHours.left + rowHours) * 100) / 100,
                right: Math.round((cumulativeHours.right + rowHours) * 100) / 100,
            };
        } else if (typeof cumulativeHours === 'number') {
            // For cars: simple addition
            cumulativeHours += rowHours;
        }

        cumulativeFuel += (it.fuel || 0) - rowConsumed;
        cumulativeReceivedFuel += it.fuel || 0;

        // Update maintenance tracking
        if (it.maintenance) {
            // Reset counters when maintenance flag is set, then include this row
            hasMaintenanceRecordsFlag = true;
            if (isBoat(vehicleConfig)) {
                cumulativeHoursFromRecentMaintenance = {
                    left: Math.round(rowHours * 100) / 100,
                    right: Math.round(rowHours * 100) / 100,
                };
            } else {
                cumulativeHoursFromRecentMaintenance = rowHours;
            }
            cumulativeFuelFromRecentMaintenance = rowConsumed;
        } else if (hasMaintenanceRecordsFlag) {
            // Only accumulate if we've seen a maintenance record
            if (isBoat(vehicleConfig) && typeof cumulativeHoursFromRecentMaintenance === 'object') {
                cumulativeHoursFromRecentMaintenance = {
                    left: Math.round((cumulativeHoursFromRecentMaintenance.left + rowHours) * 100) / 100,
                    right: Math.round((cumulativeHoursFromRecentMaintenance.right + rowHours) * 100) / 100,
                };
            } else if (typeof cumulativeHoursFromRecentMaintenance === 'number') {
                cumulativeHoursFromRecentMaintenance += rowHours;
            }
            cumulativeFuelFromRecentMaintenance += rowConsumed;
        }

        return {
            ...it,
            rowHours,
            rowConsumed,
            cumulativeHours: typeof cumulativeHours === 'object'
                ? { ...cumulativeHours }
                : cumulativeHours,
            cumulativeFuel: Math.round(cumulativeFuel * 100) / 100,
            cumulativeHoursFromRecentMaintenance: typeof cumulativeHoursFromRecentMaintenance === 'object'
                ? { ...cumulativeHoursFromRecentMaintenance }
                : cumulativeHoursFromRecentMaintenance,
            cumulativeFuelFromRecentMaintenance: Math.round(cumulativeFuelFromRecentMaintenance * 100) / 100,
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
        cumulativeReceivedFuel,
        cumulativeHoursFromRecentMaintenance: hasMaintenanceRecordsFlag ? cumulativeHoursFromRecentMaintenance : undefined,
        cumulativeFuelFromRecentMaintenance: hasMaintenanceRecordsFlag ? cumulativeFuelFromRecentMaintenance : undefined,
        hasMaintenanceRecords: hasMaintenanceRecordsFlag,
    };
}

export function calculateRoadListChain(
    roadLists: RoadList[],
    vehicleConfigs: VehicleConfig[]
): CalculatedRoadList[] {
    const results: CalculatedRoadList[] = [];

    // Track state across roadLists
    let previousMaintenanceHours: EngineHours | number | undefined;
    let previousMaintenanceFuel: number | undefined;
    let hasMaintenanceRecords = false;

    for (let i = 0; i < roadLists.length; i++) {
        const current = roadLists[i];

        // Find vehicle config
        const vehicleConfig = vehicleConfigs.find(v => v.id === current.vehicle);
        if (!vehicleConfig) {
            throw new Error(`Vehicle config not found for: ${current.vehicle}`);
        }

        const startFuel = current.startFuel;
        const startHours = current.startHours;

        // Pass maintenance state from previous roadList
        const calculated = calculateRoadList(
            current,
            vehicleConfig,
            startFuel,
            startHours,
            previousMaintenanceHours,
            previousMaintenanceFuel,
            hasMaintenanceRecords
        );

        // Update state for next roadList
        if (calculated.hasMaintenanceRecords) {
            hasMaintenanceRecords = true;
        }
        previousMaintenanceHours = calculated.cumulativeHoursFromRecentMaintenance;
        previousMaintenanceFuel = calculated.cumulativeFuelFromRecentMaintenance;

        results.push(calculated);
    }

    return results;
}