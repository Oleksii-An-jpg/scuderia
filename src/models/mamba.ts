import {QueryDocumentSnapshot, SnapshotOptions, Timestamp, WithFieldValue} from "firebase/firestore";
import {FirestoreDataConverter} from "@firebase/firestore";

export enum Vehicle {
    MAMBA = "Mamba",
    KMAR = "KMAR",
}

type BaseItinerary = {
    comment?: string;
    fuel: number | null;
    br: number | null;
}

type BaseDBModelItinerary<T = unknown> = T & BaseItinerary & {
    date: Timestamp;
}

export type BaseAppModelItinerary<T = unknown> = T & BaseItinerary & {
    date: Date;
}

type MambaSpeedModes = {
    hh: number | null;
    mh: number | null;
    sh: number | null;
    ph: number | null;
}

type KMARSpeedModes = {
    hh: number | null;
    mh: number | null;
    sh: number | null;
}

type MambaAppModelItinerary = BaseAppModelItinerary<MambaSpeedModes>;
type KMARAppModelItinerary = BaseAppModelItinerary<KMARSpeedModes>;
type MambaDBModelItinerary = BaseDBModelItinerary<MambaSpeedModes>
type KMARDBModelItinerary = BaseDBModelItinerary<KMARSpeedModes>

export type BaseRoadListAppModel<T = BaseAppModelItinerary> = {
    id: string;
    vehicle: Vehicle;
    start: Date;
    end: Date;
    startFuel: number; // Fuel at the start of the shift
    startHours: number; // Hours at the start of the shift
    itineraries: T[];
    roadListID: string | null;
}

export type BaseRoadListDBModel<T = (MambaDBModelItinerary | KMARDBModelItinerary)> = {
    id: string;
    vehicle: Vehicle;
    start: Timestamp;
    end: Timestamp;
    startFuel: number; // Fuel at the start of the shift
    startHours: number; // Hours at the start of the shift
    itineraries: T[];
    roadListID: string | null;
}

export type MambaRoadListAppModel = BaseRoadListAppModel<MambaAppModelItinerary> & {
    vehicle: Vehicle.MAMBA;
}

export type KMARRoadListAppModel = BaseRoadListAppModel<KMARAppModelItinerary> & {
    vehicle: Vehicle.KMAR;
}

export type MambaRoadListDBModel = BaseRoadListDBModel<MambaDBModelItinerary>

export type KMARRoadListDBModel = BaseRoadListDBModel<KMARDBModelItinerary>

export type RoadListUIModel<T> = BaseRoadListAppModel<T & {
    rowHours: number;
    rowConsumed: number;
    cumulativeHours: number;
    cumulativeFuel: number;
}> & {
    hours: number;
    fuel: number;
    cumulativeHours: number;
    cumulativeFuel: number;
};

export type MambaRoadListUIModel = RoadListUIModel<MambaAppModelItinerary>
export type KMARRoadListUIModel = RoadListUIModel<KMARAppModelItinerary>

export class Converter implements FirestoreDataConverter<(MambaRoadListAppModel | KMARRoadListAppModel), BaseRoadListDBModel> {
    toFirestore(model: MambaRoadListAppModel | KMARRoadListAppModel): WithFieldValue<BaseRoadListDBModel> {
        const { start, end, itineraries, startHours, roadListID, ...rest } = model;
        return {
            ...rest,
            startHours: Math.floor(startHours * 100) / 100,
            start: Timestamp.fromDate(start),
            end: Timestamp.fromDate(end),
            itineraries: itineraries.map(it => ({
                ...it,
                date: Timestamp.fromDate(it.date),
            })),
            roadListID: roadListID || null,
        };
    }

    fromFirestore(
        snapshot: QueryDocumentSnapshot<MambaRoadListDBModel | KMARRoadListDBModel>,
        options: SnapshotOptions
    ): (MambaRoadListAppModel | KMARRoadListAppModel) {
        const data = snapshot.data(options);

        const result = {
            id: snapshot.id,
            start: data.start.toDate(),
            end: data.end.toDate(),
            startFuel: data.startFuel,
            startHours: Math.floor(data.startHours * 100) / 100,
            roadListID: data.roadListID,
        }

        if (data.vehicle === Vehicle.MAMBA) {
            return {
                ...result,
                vehicle: Vehicle.MAMBA,
                itineraries: data.itineraries.map(it => ({
                    ...it,
                    date: it.date.toDate(),
                })),
            } as MambaRoadListAppModel;
        } else {
            return {
                ...result,
                vehicle: Vehicle.KMAR,
                itineraries: data.itineraries.map(it => ({
                    ...it,
                    date: it.date.toDate(),
                }))
            };
        }
    }
}
