import {
    BaseRoadListAppModel, F250RoadListAppModel, KMARRoadListAppModel,
    MambaRoadListAppModel, Vehicle, AppType, MasterRoadListAppModel,
} from "@/models/mamba";

function isMambaRoadList(roadList: BaseRoadListAppModel): roadList is MambaRoadListAppModel {
    return roadList.vehicle === Vehicle.MAMBA
}

function isKMARRoadList(roadList: BaseRoadListAppModel): roadList is KMARRoadListAppModel {
    return roadList.vehicle === Vehicle.KMAR
}

function isF250RoadList(roadList: BaseRoadListAppModel): roadList is F250RoadListAppModel {
    return roadList.vehicle === Vehicle.F250
}

function isMasterRoadList(roadList: BaseRoadListAppModel): roadList is MasterRoadListAppModel {
    return roadList.vehicle === Vehicle.MASTER
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
    },
    [Vehicle.F250]: {
        t: 0.229,
        '5%': 0.283,
        '10%': 0.297,
        '15%': 0.31,
        '4x4': 0.337,
    },
    [Vehicle.MASTER]: {
        t: 0.102,
        '5%': 0.126,
        '10%': 0.132,
        '15%': 0.138,
        '4x4': 0.23,
    }
} as const;

export function calculateCumulative(
    roadList: AppType
) {
    let cumulativeHours = (roadList.startHours || 0);
    let cumulativeFuel = (roadList.startFuel || 0);

    if (isMambaRoadList(roadList)) {
        const enhancedItineraries = roadList.itineraries.map(it => {
            const rowHours = Math.round(((it.hh || 0) + (it.mh || 0) + (it.sh || 0) + (it.ph || 0)) * 100) / 100;
            const rowConsumed = Math.round((
                (it.hh || 0) * RATES[Vehicle.MAMBA].hh +
                (it.mh || 0) * RATES[Vehicle.MAMBA].mh +
                (it.sh || 0) * RATES[Vehicle.MAMBA].sh +
                (it.ph || 0) * RATES[Vehicle.MAMBA].ph
            ));

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
    } else if (isKMARRoadList(roadList)) {
        const enhancedItineraries = roadList.itineraries.map(it => {
            const rowHours = Math.round(((it.hh || 0) + (it.mh || 0) + (it.sh || 0)) * 100) / 100;
            const rowConsumed = Math.round((
                (it.hh || 0) * RATES[Vehicle.KMAR].hh +
                (it.mh || 0) * RATES[Vehicle.KMAR].mh +
                (it.sh || 0) * RATES[Vehicle.KMAR].sh
            ));

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
    } else if (isF250RoadList(roadList)) {
        const enhancedItineraries = roadList.itineraries.map(it => {
            // Actually km, but keeping the naming consistent
            const rowHours = (it.t || 0) + (it['5%'] || 0) + (it['10%'] || 0) + (it['15%'] || 0) + (it['4x4'] || 0);
            const rowConsumed = Math.round((
                (it.t || 0) * RATES[Vehicle.F250].t +
                (it['5%'] || 0) * RATES[Vehicle.F250]['5%'] +
                (it['10%'] || 0) * RATES[Vehicle.F250]['10%'] +
                (it['15%'] || 0) * RATES[Vehicle.F250]['15%'] +
                (it['4x4'] || 0) * RATES[Vehicle.F250]['4x4']
            ));

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
    } else if (isMasterRoadList(roadList)) {
        const enhancedItineraries = roadList.itineraries.map(it => {
            // Actually km, but keeping the naming consistent
            const rowHours = (it.t || 0) + (it['5%'] || 0) + (it['10%'] || 0) + (it['15%'] || 0) + (it['4x4'] || 0);
            const rowConsumed = Math.round((
                (it.t || 0) * RATES[Vehicle.MASTER].t +
                (it['5%'] || 0) * RATES[Vehicle.MASTER]['5%'] +
                (it['10%'] || 0) * RATES[Vehicle.MASTER]['10%'] +
                (it['15%'] || 0) * RATES[Vehicle.MASTER]['15%'] +
                (it['4x4'] || 0) * RATES[Vehicle.MASTER]['4x4']
            ));

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
        throw new Error(`Unrecognized road list for ${roadList}`);
    }
}
