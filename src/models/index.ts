import {FirestoreDataConverter, QuerySnapshot} from "@firebase/firestore";
import {DocumentData, QueryDocumentSnapshot, SnapshotOptions, Timestamp, WithFieldValue, PartialWithFieldValue} from "firebase/firestore";

export enum Vehicle {
    MAMBA = "Mamba",
    KMAR = "Kmar",
}

type BaseDBItinerary = {
    date: Timestamp;
    fuel: number | null;
    br: number | null;
    comment?: string;
}

type BaseDBModelType<T extends BaseDBItinerary = BaseDBItinerary> = DocumentData & {
    vehicle: Vehicle;
    start: Timestamp;
    end: Timestamp;
    startFuel: number | null;
    startHours: number | null;
    itineraries: T[];
}

export type MambaDBModelType = BaseDBModelType<{
    date: Timestamp;
    fuel: number | null;
    br: number | null;
    sh: number | null;
    hh: number | null;
    mh: number | null;
    ph: number | null;
    total: number | null
    comment?: string;
}> & {
    vehicle: Vehicle.MAMBA;
}

export type KMARDBModelType = BaseDBModelType<{
    date: Timestamp;
    fuel: number | null;
    br: number | null;
    sh: number | null;
    hh: number | null;
    mh: number | null;
    total: number | null
    comment?: string;
}> & {
    vehicle: Vehicle.KMAR;
}

export type MambaItinerary = {
    date: Date;
    fuel: number | null;
    br: number | null;
    sh: number | null;
    hh: number | null;
    mh: number | null;
    ph: number | null;
    total: number | null;
    hours?: number | null;
    remain?: number | null;
    consumed?: number | null;
    comment?: string;
};

export type KMARItinerary = {
    date: Date;
    fuel: number | null;
    br: number | null;
    hh: number | null;
    mh: number | null;
    sh: number | null;
    total: number | null;
    hours?: number | null;
    remain?: number | null;
    consumed?: number | null;
    comment?: string;
}

type BaseAppModelType<T> = {
    id: string;
    start: Date;
    end: Date;
    vehicle: Vehicle;
    itineraries: T[];
}

export type MambaAppModelType = BaseAppModelType<MambaItinerary> & {
    vehicle: Vehicle.MAMBA;
    startHours: number | null;
    startFuel: number | null;
    totalFuel?: number;
}

export type KMARAppModelType = BaseAppModelType<KMARItinerary> & {
    vehicle: Vehicle.KMAR;
    startHours: number | null;
    startFuel: number | null;
    totalFuel?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Converter<T extends BaseAppModelType<any>, K extends BaseDBModelType> implements FirestoreDataConverter<T, K> {
    toFirestore(model: WithFieldValue<T>): WithFieldValue<K>;
    toFirestore(model: PartialWithFieldValue<T>): PartialWithFieldValue<K>;
    toFirestore(model: WithFieldValue<T> | PartialWithFieldValue<T>): WithFieldValue<K> | PartialWithFieldValue<K> {
        const { start, end, itineraries, id, ...rest } = model as T;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = {
            ...rest,
            start: Timestamp.fromDate(start),
            end: Timestamp.fromDate(end),
        };

        if (itineraries) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result.itineraries = itineraries.map(({ date, leftHours, rightHours, remain, consumed, ...itRest }: any) => {
                if (date instanceof Date) {
                    return {
                        ...itRest,
                        date: Timestamp.fromDate(date)
                    };
                }
                return {
                    ...itRest,
                    date
                };
            });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return result as any;
    }

    fromFirestore(snapshot: QueryDocumentSnapshot<K>, options?: SnapshotOptions): T {
        const data = snapshot.data(options);
        const { start, end, itineraries, ...rest } = data;
        return {
            ...rest,
            id: snapshot.id,
            start: start.toDate(),
            end: end.toDate(),
            itineraries: itineraries.map(({ date, ...itRest }) => {
                return {
                    ...itRest,
                    date: date.toDate(),
                }
            })
        } as unknown as T;
    }
}

export type MambaRoadList = MambaAppModelType & {
    startHours: number | null;
    startFuel: number | null;
    total: number;
    currentHours: number;
    consumedFuel: number;
}

export type KMARRoadList = KMARAppModelType & {
    startHours: number | null;
    startFuel: number | null;
    total: number;
    currentHours: number;
    consumedFuel: number;
};

export class RoadListModel {
    private readonly mamba: {
        ids: string[];
        byID: Map<string, MambaRoadList>;
    }
    private readonly kmar: {
        ids: string[];
        byID: Map<string, KMARRoadList>;
    }
    constructor(snapshot: QuerySnapshot<MambaAppModelType | KMARAppModelType, MambaDBModelType | KMARDBModelType>) {
        const docs = snapshot.docs.map(doc => doc.data());

        const mambaAppModelTypes = docs.filter((doc): doc is MambaAppModelType => doc.vehicle === Vehicle.MAMBA);
        const kmarAppModelTypes = docs.filter((doc): doc is KMARAppModelType => doc.vehicle === Vehicle.KMAR);

        const mambaMap: Map<string, MambaRoadList> = new Map();
        this.mamba = {
            ids: mambaAppModelTypes.map(data => data.id),
            byID: mambaAppModelTypes.reduce((acc, data, index) => {
                const previous = index > 0 ? mambaAppModelTypes[index - 1] : null;
                const currentHours = this.getTotalRecordHours(data);
                const startHours = previous ? this.getTotalRecordHours(previous) : data.startHours;
                const total = currentHours + (startHours || 0);
                const consumedFuel = this.getTotalConsumedFuel(data);
                let totalFuel = this.getTotalFuel(data);

                if (index === 0) {
                    totalFuel += data.startFuel || 0;
                }

                if (data.id) {
                    acc.set(data.id, {
                        ...data,
                        total,
                        startHours,
                        startFuel: data.startFuel,
                        currentHours,
                        consumedFuel,
                        totalFuel,
                        itineraries: data.itineraries.map(it => ({
                            ...it,
                            total: this.getItineraryHours(it),
                        }))
                    });
                }

                return acc;
            }, mambaMap),
        }

        const kmarMap: Map<string, KMARRoadList> = new Map();
        this.kmar = {
            ids: kmarAppModelTypes.map(data => data.id),
            byID: kmarAppModelTypes.reduce((acc, data, index) => {
                const previous = index > 0 ? kmarAppModelTypes[index - 1] : null;
                const currentHours = this.getTotalRecordHoursKMAR(data);
                const startHours = previous ? this.getTotalRecordHoursKMAR(previous) : data.startHours;
                const total = currentHours + (startHours || 0);
                const consumedFuel = this.getTotalConsumedFuelKMAR(data);
                let totalFuel = this.getTotalFuel(data);

                if (index === 0) {
                    totalFuel += data.startFuel || 0;
                }

                if (data.id) {
                    acc.set(data.id, {
                        ...data,
                        total,
                        startHours,
                        startFuel: data.startFuel,
                        currentHours,
                        consumedFuel,
                        totalFuel,
                        itineraries: data.itineraries.map(it => ({
                            ...it,
                            total: this.getItineraryHoursKMAR(it),
                        }))
                    });
                }

                return acc;
            }, kmarMap),
        }
    }

    private getItineraryHours(itinerary: MambaItinerary): number {
        const { hh, sh, mh, ph } = itinerary;
        return [hh, sh, mh, ph].reduce<number>((acc, curr) => acc + (curr || 0), 0);
    }

    private getItineraryHoursKMAR(itinerary: KMARItinerary): number {
        const { hh, sh, mh } = itinerary;
        return [hh, sh, mh].reduce<number>((acc, curr) => acc + (curr || 0), 0);
    }

    private getTotalRecordHours(record: MambaAppModelType): number {
        return record.itineraries.reduce<number>((acc, curr) => {
            acc += this.getItineraryHours(curr);
            return acc;
        }, 0);
    }

    private getTotalRecordHoursKMAR(record: KMARAppModelType): number {
        return record.itineraries.reduce<number>((acc, curr) => {
            acc += this.getItineraryHoursKMAR(curr);
            return acc;
        }, 0);
    }

    private getTotalFuel(record: MambaAppModelType | KMARAppModelType): number {
        return record.itineraries.reduce<number>((acc, curr) => {
            const { fuel } = curr;
            acc += fuel || 0;
            return acc;
        }, 0);
    }

    private getTotalConsumedFuel(record: MambaAppModelType): number {
        return record.itineraries.reduce<number>((acc, curr) => {
            const { hh, mh, sh, ph } = curr;
            const consumed = Math.round(((hh || 0) * 6.3 + (mh || 0) * 31.2 + (sh || 0) * 137 + (ph || 0) * 253) * 100) / 100;
            acc += consumed;
            return acc;
        }, 0);
    }

    private getTotalConsumedFuelKMAR(record: KMARAppModelType): number {
        return record.itineraries.reduce<number>((acc, curr) => {
            const { hh, mh, sh } = curr;
            const consumed = Math.round(((hh || 0) * 6.3 + (mh || 0) * 31.2 + (sh || 0) * 137) * 100) / 100;
            acc += consumed;
            return acc;
        }, 0);
    }

    public getByVehicle(vehicle: Vehicle): {
        ids: string[];
        byID: Map<string, MambaRoadList | KMARRoadList>;
    } {
        switch (vehicle) {
            case Vehicle.MAMBA:
                return this.mamba;
            case Vehicle.KMAR:
                return this.kmar;
        }
    }

    public getAccumulatedValues(vehicle: Vehicle) {
        const records = Array.from(this.getByVehicle(vehicle).byID.values());
        const lastRecord = records[records.length - 1];
        if (!lastRecord) {
            return {
                total: 0,
                startFuel: 0
            };
        }
        return {
            total: lastRecord.total,
            startFuel: Math.round(((lastRecord.totalFuel || 0) - lastRecord.consumedFuel) * 100) / 100
        };
    }
}