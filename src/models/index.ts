import {FirestoreDataConverter, QuerySnapshot} from "@firebase/firestore";
import {QueryDocumentSnapshot, SnapshotOptions, Timestamp} from "firebase/firestore";

enum Vehicle {
    MAMBA = "Mamba",
    KMAR = "Kmar",
}

export type MambaDBModelType = {
    vehicle: Vehicle.MAMBA;
    start: Timestamp;
    end: Timestamp;
    startFuel: number | null;
    startHours: number | null;
    itineraries: {
        date: Timestamp;
        fuel: number | null;
        br: number | null;
        sh: number | null;
        hh: number | null;
        mh: number | null;
        ph: number | null;
        total: number | null
        comment?: string;
    }[]
}

export type Itinerary = {
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

export type MambaAppModelType = {
    id: string;
    start: Date;
    end: Date;
    vehicle: Vehicle.MAMBA;
    startHours: number | null;
    startFuel: number | null;
    totalFuel?: number;
    itineraries: Itinerary[]
}

export class MambaConverter implements FirestoreDataConverter<MambaAppModelType, MambaDBModelType> {
    toFirestore({ start, end, itineraries, ...rest }: MambaAppModelType): MambaDBModelType {
        return {
            ...rest,
            start: Timestamp.fromDate(start),
            end: Timestamp.fromDate(end),
            itineraries: itineraries.map(({ date, ...rest }) => {
                return {
                    ...rest,
                    date: Timestamp.fromDate(date)
                }
            })
        }
    }

    fromFirestore(snapshot: QueryDocumentSnapshot<MambaDBModelType>, options: SnapshotOptions): MambaAppModelType {
        const { start, end, itineraries, ...rest } = snapshot.data(options);
        return {
            ...rest,
            id: snapshot.id,
            start: start.toDate(),
            end: end.toDate(),
            itineraries: itineraries.map(({ date, ...rest }) => {
                return {
                    ...rest,
                    date: date.toDate(),
                }
            })
        };
    }
}

export type MambaRoadList = MambaAppModelType & {
    startHours: number | null;
    startFuel: number | null;
    total: number;
    currentHours: number;
    consumedFuel: number;
}

export class RoadListModel {
    private readonly mamba: {
        ids: string[];
        byID: Map<string, MambaRoadList>;
    }
    private readonly kmar: {
        ids: string[];
        byID: Map<string, MambaRoadList>;
    }
    constructor(snapshot: QuerySnapshot<MambaAppModelType, MambaDBModelType>) {
        const docs = snapshot.docs.map(doc => doc.data());

        const t: Map<string, MambaRoadList> = new Map();
        const mambaAppModelTypes = docs.filter(doc => doc.vehicle === Vehicle.MAMBA);
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
            }, t),
        }

        this.kmar = {
            ids: [],
            byID: new Map(),
        }
    }
    private getItineraryHours(itinerary: MambaAppModelType["itineraries"][number]) {
        const { hh, sh, mh, ph } = itinerary;
        return [hh, sh, mh, ph].reduce<number>((acc, curr) => acc + (curr || 0), 0);
    }
    private getTotalRecordHours(record: MambaAppModelType) {
        return record.itineraries.reduce<number>((acc, curr) => {
            acc += this.getItineraryHours(curr);
            return acc;
        }, 0);
    }
    private getTotalFuel(record: MambaAppModelType) {
        return record.itineraries.reduce<number>((acc, curr) => {
            const { fuel } = curr;
            acc += fuel || 0;
            return acc;
        }, 0);
    }
    private getTotalConsumedFuel(record: MambaAppModelType) {
        return record.itineraries.reduce<number>((acc, curr) => {
            const { hh, mh, sh, ph } = curr;
            const consumed = Math.round(((hh || 0) * 6.3 + (mh || 0) * 31.2 + (sh || 0) * 137 + (ph || 0) * 253) * 100) / 100;
            acc += consumed;
            return acc;
        }, 0);
    }
    public getByVehicle(vehicle: Vehicle): {
        ids: string[];
        byID: Map<string, MambaRoadList>;
    } {
        switch (vehicle) {
            case Vehicle.MAMBA:
                return this.mamba;
            case Vehicle.KMAR:
                return this.kmar;
        }
    }
    public getAccumulatedValues() {
        const records = Array.from(this.mamba.byID.values());
        const lastRecord = records[records.length - 1];
        return {
            total: lastRecord.total,
            startFuel: Math.round(((lastRecord.totalFuel || 0) - lastRecord.consumedFuel) * 100) / 100
        };
    }
}
