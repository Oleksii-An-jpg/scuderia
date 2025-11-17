import {QueryDocumentSnapshot, SnapshotOptions, Timestamp, WithFieldValue} from "firebase/firestore";
import {FirestoreDataConverter} from "@firebase/firestore";

export enum Vehicle {
    MAMBA = "Mamba",
    KMAR = "KMAR",
    F250 = "F250",
    MASTER = "Master",
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

type F250SpeedModes = {
    t: number | null;
    '5%': number | null;
    '10%': number | null;
    '15%': number | null;
    '4x4': number | null;
}

type MasterSpeedModes = {
    t: number | null;
    '5%': number | null;
    '10%': number | null;
    '15%': number | null;
    '4x4': number | null;
}

type MambaAppModelItinerary = BaseAppModelItinerary<MambaSpeedModes>;
type KMARAppModelItinerary = BaseAppModelItinerary<KMARSpeedModes>;
type F250AppModelItinerary = BaseAppModelItinerary<F250SpeedModes>;
type MasterAppModelItinerary = BaseAppModelItinerary<MasterSpeedModes>;
type MambaDBModelItinerary = BaseDBModelItinerary<MambaSpeedModes>;
type KMARDBModelItinerary = BaseDBModelItinerary<KMARSpeedModes>;
type F250DBModelItinerary = BaseDBModelItinerary<F250SpeedModes>;
type MasterDBModelItinerary = BaseDBModelItinerary<MasterSpeedModes>;

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

export type BaseRoadListDBModel<T = (MambaDBModelItinerary | KMARDBModelItinerary | F250DBModelItinerary | MasterDBModelItinerary)> = {
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

export type F250RoadListAppModel = BaseRoadListAppModel<F250AppModelItinerary> & {
    vehicle: Vehicle.F250;
}

export type MasterRoadListAppModel = BaseRoadListAppModel<MasterAppModelItinerary> & {
    vehicle: Vehicle.MASTER;
}

export type MambaRoadListDBModel = BaseRoadListDBModel<MambaDBModelItinerary>;
export type KMARRoadListDBModel = BaseRoadListDBModel<KMARDBModelItinerary>;
export type F250RoadListDBModel = BaseRoadListDBModel<F250DBModelItinerary>;
export type MasterRoadListDBModel = BaseRoadListDBModel<MasterDBModelItinerary>;

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
export type F250RoadListUIModel = RoadListUIModel<F250AppModelItinerary>
export type MasterRoadListUIModel = RoadListUIModel<MasterAppModelItinerary>

type DBType = MambaRoadListDBModel | KMARRoadListDBModel | F250RoadListDBModel | MasterRoadListDBModel;
export type AppType = MambaRoadListAppModel | KMARRoadListAppModel | F250RoadListAppModel | MasterRoadListAppModel;

function isMamba(model: DBType): model is MambaRoadListDBModel {
    return model.vehicle === Vehicle.MAMBA;
}

function isKMAR(model: DBType): model is KMARRoadListDBModel {
    return model.vehicle === Vehicle.KMAR;
}

function isF250(model: DBType): model is F250RoadListDBModel {
    return model.vehicle === Vehicle.F250;
}

function isMaster(model: DBType): model is MasterRoadListDBModel {
    return model.vehicle === Vehicle.MASTER;
}

export class Converter implements FirestoreDataConverter<AppType, BaseRoadListDBModel> {
    toFirestore(model: MambaRoadListAppModel | KMARRoadListAppModel | F250RoadListAppModel | MasterRoadListAppModel): WithFieldValue<BaseRoadListDBModel> {
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
        snapshot: QueryDocumentSnapshot<MambaRoadListDBModel | KMARRoadListDBModel | F250RoadListDBModel | MasterRoadListDBModel>,
        options: SnapshotOptions
    ): (MambaRoadListAppModel | KMARRoadListAppModel | F250RoadListAppModel | MasterRoadListAppModel) {
        const data = snapshot.data(options);

        const result = {
            id: snapshot.id,
            start: data.start.toDate(),
            end: data.end.toDate(),
            startFuel: data.startFuel,
            startHours: Math.floor(data.startHours * 100) / 100,
            roadListID: data.roadListID,
        }

        if (isMaster(data)) {
            return {
                ...result,
                vehicle: Vehicle.MASTER,
                itineraries: data.itineraries.map(it => ({
                    ...it,
                    date: it.date.toDate(),
                }))
            }
        }

        if (isF250(data)) {
            return {
                ...result,
                vehicle: Vehicle.F250,
                itineraries: data.itineraries.map(it => ({
                    ...it,
                    date: it.date.toDate(),
                }))
            }
        }

        if (isMamba(data)) {
            return {
                ...result,
                vehicle: Vehicle.MAMBA,
                itineraries: data.itineraries.map(it => ({
                    ...it,
                    date: it.date.toDate(),
                })),
            }
        }

        if (isKMAR(data)) {
            return {
                ...result,
                vehicle: Vehicle.KMAR,
                itineraries: data.itineraries.map(it => ({
                    ...it,
                    date: it.date.toDate(),
                }))
            };
        }

        throw new Error('Unknown vehicle type')
    }
}
