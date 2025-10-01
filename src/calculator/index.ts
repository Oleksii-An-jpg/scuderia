import {
    BaseRoadListAppModel, KMARRoadListAppModel,
    MambaRoadListAppModel, Vehicle,
} from "@/models/mamba";

function isMambaRoadList(roadList: BaseRoadListAppModel): roadList is MambaRoadListAppModel {
    return roadList.vehicle === Vehicle.MAMBA
}

function isKMARRoadList(roadList: BaseRoadListAppModel): roadList is KMARRoadListAppModel {
    return roadList.vehicle === Vehicle.KMAR
}

const RATES = {
    [Vehicle.MAMBA]: {
        hh: 6.3,
        mh: 31.2,
        sh: 137,
        ph: 253,
    },
    [Vehicle.KMAR]: {
        hh: 5.5,
        mh: 54.7,
        sh: 199,
    }
} as const;

export function calculateCumulative(
    roadList: MambaRoadListAppModel | KMARRoadListAppModel
) {
    let cumulativeHours = roadList.startHours;
    let cumulativeFuel = roadList.startFuel;

    if (isMambaRoadList(roadList)) {
        const enhancedItineraries = roadList.itineraries.map(it => {
            const rowHours = (it.hh || 0) + (it.mh || 0) + (it.sh || 0) + (it.ph || 0);
            const rowConsumed = Math.ceil(Math.round((
                (it.hh || 0) * RATES[Vehicle.MAMBA].hh +
                (it.mh || 0) * RATES[Vehicle.MAMBA].mh +
                (it.sh || 0) * RATES[Vehicle.MAMBA].sh +
                (it.ph || 0) * RATES[Vehicle.MAMBA].ph
            ) * 100) / 100);

            cumulativeHours += rowHours;
            cumulativeFuel += (it.fuel || 0) - rowConsumed;

            return {
                ...it,
                rowHours,
                rowConsumed,
                cumulativeHours,
                cumulativeFuel: Math.round(cumulativeFuel * 100) / 100,
            };
        });

        const totalRowHours = enhancedItineraries.reduce((sum, it) => sum + it.rowHours, 0);
        const totalRowConsumed = enhancedItineraries.reduce((sum, it) => sum + it.rowConsumed, 0);

        return {
            ...roadList,
            itineraries: enhancedItineraries,
            hours: totalRowHours,
            fuel: totalRowConsumed,
            cumulativeHours,
            cumulativeFuel: Math.round(cumulativeFuel * 100) / 100,
        };
    } else {
        const enhancedItineraries = roadList.itineraries.map(it => {
            const rowHours = (it.hh || 0) + (it.mh || 0) + (it.sh || 0);
            const rowConsumed = Math.round((
                (it.hh || 0) * RATES[Vehicle.KMAR].hh +
                (it.mh || 0) * RATES[Vehicle.KMAR].mh +
                (it.sh || 0) * RATES[Vehicle.KMAR].sh
            ) * 100) / 100;

            cumulativeHours += rowHours;
            cumulativeFuel += (it.fuel || 0) - rowConsumed;

            return {
                ...it,
                rowHours,
                rowConsumed,
                cumulativeHours,
                cumulativeFuel: Math.round(cumulativeFuel * 100) / 100,
            };
        });

        const totalRowHours = enhancedItineraries.reduce((sum, it) => sum + it.rowHours, 0);
        const totalRowConsumed = enhancedItineraries.reduce((sum, it) => sum + it.rowConsumed, 0);

        return {
            ...roadList,
            itineraries: enhancedItineraries,
            hours: totalRowHours,
            fuel: totalRowConsumed,
            cumulativeHours,
            cumulativeFuel: Math.round(cumulativeFuel * 100) / 100,
        };
    }
}
