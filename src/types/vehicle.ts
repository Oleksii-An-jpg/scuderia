export enum Vehicle {
    MAMBA = 'Mamba',
    KMAR = 'KMAR',
    F250 = 'F250',
    MASTER = 'Master'
}

export type VehicleType = 'boat' | 'car';

type BoatConfig = {
    type: 'boat';
    speedModes: readonly string[];
    rates: Record<string, number>;
    labels: Record<string, string>;
    unit: 'hours';
}

type CarConfig = {
    type: 'car';
    terrainModes: readonly string[];
    rates: Record<string, number>;
    labels: Record<string, string>;
    unit: 'km';
}

export type VehicleConfig = BoatConfig | CarConfig;

export const VEHICLE_CONFIG: Record<Vehicle, VehicleConfig> = {
    [Vehicle.MAMBA]: {
        type: 'boat',
        speedModes: ['hh', 'mh', 'sh', 'ph'],
        rates: { hh: 6.3, mh: 31.2, sh: 137, ph: 253 },
        labels: { hh: 'ХХ', mh: 'МХ', sh: 'СХ', ph: 'ПХ' },
        unit: 'hours'
    },
    [Vehicle.KMAR]: {
        type: 'boat',
        speedModes: ['hh', 'mh', 'sh'],
        rates: { hh: 5.5, mh: 54.7, sh: 199 },
        labels: { hh: 'ХХ', mh: 'МХ', sh: 'СХ' },
        unit: 'hours'
    },
    [Vehicle.F250]: {
        type: 'car',
        terrainModes: ['t', '5%', '10%', '15%', '4x4'],
        rates: { t: 0.229, '5%': 0.283, '10%': 0.297, '15%': 0.31, '4x4': 0.337 },
        labels: { t: 'Трасса', '5%': '5%', '10%': '10%', '15%': '15%', '4x4': '4x4' },
        unit: 'km'
    },
    [Vehicle.MASTER]: {
        type: 'car',
        terrainModes: ['t', '5%', '10%', '15%', '4x4'],
        rates: { t: 0.102, '5%': 0.126, '10%': 0.132, '15%': 0.138, '4x4': 0.23 },
        labels: { t: 'Трасса', '5%': '5%', '10%': '10%', '15%': '15%', '4x4': '4x4' },
        unit: 'km'
    }
} as const;

export function getModes(vehicle: Vehicle): readonly string[] {
    const config = VEHICLE_CONFIG[vehicle];
    return config.type === 'boat' ? config.speedModes : config.terrainModes;
}

export function isBoat(vehicle: Vehicle): boolean {
    return VEHICLE_CONFIG[vehicle].type === 'boat';
}

export function isCar(vehicle: Vehicle): boolean {
    return VEHICLE_CONFIG[vehicle].type === 'car';
}