// src/components/RoadLists/index.tsx

'use client';
import {FC, useEffect, useMemo, useState} from 'react';
import {
    Card,
    VStack,
    Tabs,
    Dialog,
    Portal,
    Button,
    CloseButton,
    Text, HStack,
    Link as ChakraLink, Icon, ButtonGroup
} from '@chakra-ui/react';
import { useStore } from '@/lib/store';
import { useVehicleStore } from '@/lib/vehicleStore';
import { getModes, isBoat } from '@/types/vehicle';
import { EngineHours, Itinerary, RoadList } from '@/types/roadList';
import RoadListTable from '@/components/RoadListTable';
import VehicleSummary from '@/components/VehicleSummary';
import RoadListForm from '@/components/RoadListForm';
import {auth, subscribeToRoadLists} from "@/lib/firebase";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {BiAnchor, BiPlus, BiDownload} from "react-icons/bi";
import { exportAllVehiclesToXlsx } from '@/lib/exportXlsx';
import {signOut} from "firebase/auth";
import {deleteSession} from "@/app/actions";

type RoadListProps = {
    role?: string;
}

export type Balance = {
    fuel: number;
    hours: EngineHours | number;
}

function balanceAfter(previous?: { cumulativeFuel: number; cumulativeHours: EngineHours | number }): Balance | null {
    if (!previous) return null;
    return { fuel: previous.cumulativeFuel, hours: previous.cumulativeHours };
}

const RoadLists: FC<RoadListProps> = ({ role }) => {
    const loading = useStore(state => state.loading);
    const selectedVehicle = useStore(state => state.selectedVehicle);
    const setSelectedVehicle = useStore(state => state.setSelectedVehicle);
    const getByVehicle = useStore(state => state.getByVehicle);
    const getById = useStore(state => state.getById);
    const deleteRoadList = useStore(state => state.delete);
    const hydrate = useStore(state => state.hydrate);

    const vehicles = useVehicleStore(state => state.activeVehicles);
    const allVehicleConfigs = useVehicleStore(state => state.vehicles);
    const calculatedCache = useStore(state => state.calculatedCache);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Hydrate straight from the subscription payload. It already carries every
    // document, so there is nothing left to fetch when something changes.
    useEffect(() => subscribeToRoadLists(roadLists => hydrate(roadLists)), [hydrate]);

    // Set initial selected vehicle if none selected
    useEffect(() => {
        if (!selectedVehicle && vehicles.length > 0) {
            setSelectedVehicle(vehicles[0].id);
        }
    }, [selectedVehicle, vehicles, setSelectedVehicle]);

    const roadLists = useMemo(
        () => (selectedVehicle ? calculatedCache[selectedVehicle] ?? [] : []),
        [selectedVehicle, calculatedCache]
    );

    // The road list being edited, plus the balance carried into it from the road
    // list before it. A road list that opens a chain has nothing carried in.
    const editing = useMemo<{ roadList: RoadList; carried: Balance | null } | null>(() => {
        if (!selectedVehicle) return null;

        const vehicleConfig = useVehicleStore.getState().vehicles.find(v => v.id === selectedVehicle);
        if (!vehicleConfig) return null;

        if (editingId) {
            const roadList = getById(editingId);
            if (!roadList) return null;

            const index = roadLists.findIndex(rl => rl.id === editingId);
            return { roadList, carried: balanceAfter(index > 0 ? roadLists[index - 1] : undefined) };
        }

        // Creating new roadlist, appended after the current last one
        const lastRoadList = roadLists[roadLists.length - 1];
        const modes = getModes(vehicleConfig);

        const newItinerary: Itinerary = {
            date: new Date(),
            br: null,
            fuel: null,
            comment: '',
            startTime: '09:00'
        };

        modes.forEach(mode => {
            // @ts-expect-error: dynamic keys
            newItinerary[mode.id] = null;
        });

        let initialStartHours;
        if (lastRoadList) {
            initialStartHours = lastRoadList.cumulativeHours;
        } else {
            initialStartHours = isBoat(vehicleConfig)
                ? { left: 0, right: 0 }
                : 0;
        }

        return {
            roadList: {
                vehicle: selectedVehicle,
                start: new Date(),
                end: new Date(),
                startFuel: lastRoadList?.cumulativeFuel ?? 0,
                startHours: initialStartHours,
                resetBalance: false,
                itineraries: [newItinerary],
            },
            carried: balanceAfter(lastRoadList),
        };
    }, [editingId, roadLists, selectedVehicle, getById]);

    const editingRoadList = editing?.roadList ?? null;

    const deletingRoadList = useMemo(() => {
        return deletingId ? getById(deletingId) : null;
    }, [deletingId, getById]);

    const handleOpenForm = (id?: string) => {
        setEditingId(id ?? null);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingId(null);
    };

    const handleOpenDelete = (id: string) => {
        setDeletingId(id);
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (deletingId) {
            await deleteRoadList(deletingId);
            setIsDeleteOpen(false);
            setDeletingId(null);
        }
    };

    const pathname = usePathname();
    const vehiclesInitialized = useVehicleStore(state => state.initialized);

    if (vehiclesInitialized && vehicles.length === 0) {
        return (
            <Card.Root>
                <Card.Body>
                    <Text>Транспортні засоби відсутні, або не налаштовані. Будь ласка, додайте з адмінки.</Text>
                </Card.Body>
            </Card.Root>
        );
    }

    async function handleLogout() {
        await signOut(auth);
        await deleteSession();
    }

    return (
        <VStack alignItems="stretch">
            <Card.Root>
                <Card.Header>
                    <HStack justifyContent="space-between" className="relative">
                        <Text>Дорожні листи</Text>
                        <ButtonGroup>
                            {role === 'admin' ? <Button colorPalette="yellow" asChild>
                                <ChakraLink asChild>
                                    <Link href="/admin"><BiAnchor /> Адмінка</Link>
                                </ChakraLink>
                            </Button> : null}
                            <Button colorPalette="blue" onClick={handleLogout}>
                                Вийти
                            </Button>
                        </ButtonGroup>
                    </HStack>
                </Card.Header>
                <Card.Body>
                    <Tabs.Root
                        lazyMount
                        unmountOnExit
                        value={selectedVehicle || undefined}
                        onValueChange={(e) => {
                            const params = new URLSearchParams();
                            setSelectedVehicle(e.value);
                            params.set('vehicle', e.value);
                            window.history.replaceState({}, '', `${pathname}?${params.toString()}`)
                        }}
                        variant="plain"
                    >
                        <Tabs.List
                            display="grid"
                            gridTemplateColumns="repeat(auto-fill, minmax(260px, 1fr))"
                            gap={2}
                            mb={4}
                        >
                            {vehicles.map(vehicle => (
                                <Tabs.Trigger
                                    key={vehicle.id}
                                    value={vehicle.id}
                                    h="auto"
                                    px={3}
                                    py={2}
                                    alignItems="flex-start"
                                    borderWidth="1px"
                                    borderColor="border"
                                    borderRadius="md"
                                    bg="bg"
                                    color="fg"
                                    _hover={{ bg: 'bg.muted' }}
                                    _selected={{ borderColor: 'blue.500', bg: 'blue.50', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                                >
                                    <VehicleSummary vehicle={vehicle} roadLists={getByVehicle(vehicle.id)} />
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>

                        {vehicles.map(vehicle => (
                            <Tabs.Content key={vehicle.id} value={vehicle.id}>
                                <RoadListTable
                                    loading={loading}
                                    roadLists={getByVehicle(vehicle.id)}
                                    onOpen={handleOpenForm}
                                    onDelete={handleOpenDelete}
                                />
                            </Tabs.Content>
                        ))}
                    </Tabs.Root>
                </Card.Body>
                <Card.Footer shadow="inset" className="bg-white sticky bottom-0">
                    <HStack pt={4}>
                        <Button variant="solid" colorPalette="green" size="lg" onClick={() => handleOpenForm()}>
                            <Icon>
                                <BiPlus />
                            </Icon>
                            Додати дорожній лист
                        </Button>
                        <Button
                            variant="outline"
                            colorPalette="blue"
                            size="lg"
                            onClick={() => exportAllVehiclesToXlsx(calculatedCache, allVehicleConfigs)}
                        >
                            <Icon>
                                <BiDownload />
                            </Icon>
                            Завантажити xlsx
                        </Button>
                    </HStack>
                </Card.Footer>
            </Card.Root>

            {/* Form Dialog */}
            <Dialog.Root
                scrollBehavior="inside"
                size="cover"
                open={isFormOpen}
                onOpenChange={(e) => e.open ? null : handleCloseForm()}
            >
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxH="100%">
                            <Dialog.Header>
                                <Dialog.Title>
                                    Дорожній лист від {editingRoadList && new Intl.DateTimeFormat('uk-UA', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: '2-digit'
                                }).format(editingRoadList.start)} по {editingRoadList && new Intl.DateTimeFormat('uk-UA', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: '2-digit'
                                }).format(editingRoadList.end)}
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                {editing && (
                                    <RoadListForm
                                        roadList={editing.roadList}
                                        carried={editing.carried}
                                        onClose={handleCloseForm}
                                    />
                                )}
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">Скасувати</Button>
                                </Dialog.ActionTrigger>
                                <Button loading={loading} form="upsert" type="submit">
                                    Зберегти
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger asChild>
                                <CloseButton size="sm" />
                            </Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* Delete Dialog */}
            <Dialog.Root
                role="alertdialog"
                open={isDeleteOpen}
                onOpenChange={(e) => setIsDeleteOpen(e.open)}
            >
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxH="100%">
                            <Dialog.Header>
                                <Dialog.Title>
                                    Видалити дорожній лист від {deletingRoadList && new Intl.DateTimeFormat('uk-UA', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: '2-digit'
                                }).format(deletingRoadList.start)} по {deletingRoadList && new Intl.DateTimeFormat('uk-UA', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: '2-digit'
                                }).format(deletingRoadList.end)}
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                Цю дію неможливо скасувати. Це призведе до остаточного видалення дорожнього листу з системи.
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">Скасувати</Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorPalette="red"
                                    loading={loading}
                                    onClick={handleDelete}
                                >
                                    Видалити
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger asChild>
                                <CloseButton size="sm" />
                            </Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </VStack>
    );
}

export default RoadLists;