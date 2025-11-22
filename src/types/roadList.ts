import { Vehicle } from './vehicle';
import {Timestamp} from "firebase/firestore";

export type Itinerary = {
    date: Date;
    br: number | null;
    fuel: number | null;
    comment?: string;
    // Dynamic fields for speed modes or terrain types
    [key: string]: number | null | Date | string | undefined;
}

export type RoadList = {
    id?: string;
    vehicle: Vehicle;
    roadListID?: string;
    start: Date;
    end: Date;
    startFuel: number;
    startHours: number;
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
    cumulativeHours: number;
    cumulativeFuel: number;
}

export type CalculatedRoadList = RoadList & {
    itineraries: CalculatedItinerary[];
    hours: number;
    fuel: number;
    cumulativeHours: number;
    cumulativeFuel: number;
}

// Firestore converter types
export type FirestoreItinerary = Omit<Itinerary, 'date'> & {
    date: Timestamp;
}

export type FirestoreRoadList = Omit<RoadList, 'start' | 'end' | 'itineraries'> & {
    start: Timestamp;
    end: Timestamp;
    itineraries: FirestoreItinerary[];
}