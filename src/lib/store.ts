import { create } from 'zustand';
import { RoadList, CalculatedRoadList } from '@/types/roadList';
import { Vehicle } from '@/types/vehicle';
import { getAllRoadLists, upsertRoadList, deleteRoadList } from '@/lib/firebase';
import { calculateRoadListChain } from '@/lib/calculations';

type StoreState = {
    roadLists: RoadList[];
    loading: boolean;
    selectedVehicle: Vehicle;
    // Cache for calculated results per vehicle
    calculatedCache: Record<Vehicle, CalculatedRoadList[]>;
}

type StoreActions = {
    fetchAll: () => Promise<void>;
    hydrate: (roadLists: RoadList[]) => void;
    upsert: (roadList: RoadList) => Promise<void>;
    delete: (id: string, vehicle: Vehicle) => Promise<void>;
    setSelectedVehicle: (vehicle: Vehicle) => void;

    // Selectors
    getByVehicle: (vehicle: Vehicle) => CalculatedRoadList[];
    getById: (id: string) => RoadList | undefined;
}

function calculateAllCaches(roadLists: RoadList[]): Record<Vehicle, CalculatedRoadList[]> {
    return {
        [Vehicle.MAMBA]: calculateRoadListChain(
            roadLists.filter(rl => rl.vehicle === Vehicle.MAMBA).sort((a, b) => a.end.getTime() - b.end.getTime())
        ),
        [Vehicle.KMAR]: calculateRoadListChain(
            roadLists.filter(rl => rl.vehicle === Vehicle.KMAR).sort((a, b) => a.end.getTime() - b.end.getTime())
        ),
        [Vehicle.F250]: calculateRoadListChain(
            roadLists.filter(rl => rl.vehicle === Vehicle.F250).sort((a, b) => a.end.getTime() - b.end.getTime())
        ),
        [Vehicle.MASTER]: calculateRoadListChain(
            roadLists.filter(rl => rl.vehicle === Vehicle.MASTER).sort((a, b) => a.end.getTime() - b.end.getTime())
        ),
    };
}

export const useStore = create<StoreState & StoreActions>((set, get) => ({
    roadLists: [],
    loading: false,
    selectedVehicle: Vehicle.MAMBA,
    calculatedCache: {
        [Vehicle.MAMBA]: [],
        [Vehicle.KMAR]: [],
        [Vehicle.F250]: [],
        [Vehicle.MASTER]: [],
    },

    fetchAll: async () => {
        set({ loading: true });
        try {
            const roadLists = await getAllRoadLists();
            get().hydrate(roadLists);
            set({ loading: false });
        } catch (error) {
            console.error('Error fetching road lists:', error);
            set({ loading: false });
        }
    },

    hydrate: (roadLists: RoadList[]) => {
        const calculatedCache = calculateAllCaches(roadLists);
        set({ roadLists, calculatedCache });
    },

    upsert: async (roadList) => {
        set({ loading: true });
        try {
            const allRoadLists = get().roadLists;
            await upsertRoadList(roadList, roadList.vehicle, allRoadLists);
            await get().fetchAll();
        } catch (error) {
            console.error('Error upserting road list:', error);
            set({ loading: false });
        }
    },

    delete: async (id, vehicle) => {
        set({ loading: true });
        try {
            const allRoadLists = get().roadLists;
            await deleteRoadList(id, vehicle, allRoadLists);
            await get().fetchAll();
        } catch (error) {
            console.error('Error deleting road list:', error);
            set({ loading: false });
        }
    },

    setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

    getByVehicle: (vehicle) => {
        return get().calculatedCache[vehicle] || [];
    },

    getById: (id) => {
        return get().roadLists.find(rl => rl.id === id);
    },
}));