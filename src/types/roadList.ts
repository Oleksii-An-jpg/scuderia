import { Vehicle } from './vehicle';
import {Timestamp} from "firebase/firestore";

export type Itinerary = {
    date: Date;
    br: number | null;
    fuel: number | null;
    comment?: string;
    docs?: (string | File)[];
    maintenance?: boolean;
    startTime?: string;
    // Dynamic fields for speed modes or terrain types
    // [key: string]: number | null | Date | string | undefined;
}

// Engine hours for boats
export type EngineHours = {
    left: number;
    right: number;
}

export type RoadList = {
    id?: string;
    vehicle: Vehicle;
    roadListID?: string;
    start: Date;
    end: Date;
    // Opening balance. Only read when this is the first road list of a vehicle's
    // chain, or when resetBalance is set; otherwise the balance is carried forward
    // from the previous road list. See calculateRoadListChain.
    startFuel: number;
    // For boats: { left, right }, for cars: just a number (km)
    startHours: EngineHours | number;
    // Opt in to using this road list's own startFuel/startHours instead of the
    // values carried forward, to correct a drifted remainder mid-history.
    resetBalance?: boolean;
    itineraries: Itinerary[];
}

// Serializable version for server -> client transfer
export type SerializableItinerary = Omit<Itinerary, 'date'> & {
    date: string;
}

export type SerializableRoadList = Omit<RoadList, 'start' | 'end' | 'itineraries'> & {
    start: string;
    end: string;
    itineraries: SerializableItinerary[];
}

export type CalculatedItinerary = Itinerary & {
    rowHours: number;
    rowConsumed: number;
    cumulativeHours: EngineHours | number;
    cumulativeFuel: number;
}

export type CalculatedRoadList = RoadList & {
    itineraries: CalculatedItinerary[];
    hours: number;
    fuel: number;
    // The opening balance actually used, after carry-forward. Display this rather
    // than startFuel/startHours, which are only meaningful when they open a chain.
    openingFuel: number;
    openingHours: EngineHours | number;
    cumulativeHours: EngineHours | number;
    cumulativeFuel: number;
    cumulativeReceivedFuel: number;
    cumulativeHoursFromRecentMaintenance?: EngineHours | number;
    cumulativeFuelFromRecentMaintenance?: number;
    hasMaintenanceRecords?: boolean;
}

// Firestore converter types
export type FirestoreItinerary = Omit<Itinerary, 'date'> & {
    date: Timestamp;
    docs?: string[];
}

export type FirestoreRoadList = Omit<RoadList, 'start' | 'end' | 'itineraries'> & {
    start: Timestamp;
    end: Timestamp;
    itineraries: FirestoreItinerary[];
}