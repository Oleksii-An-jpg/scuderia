// src/components/RoadLists/index.tsx

'use client';
import {FC, useEffect, useMemo, useRef, useState} from 'react';
import {
    Card,
    VStack,
    Tabs,
    Dialog,
    Portal,
    Button,
    CloseButton
} from '@chakra-ui/react';
import { useStore } from '@/lib/store';
import { useVehicleStore } from '@/lib/vehicleStore';
import { Vehicle, getModes, isBoat } from '@/types/vehicle';
import { Itinerary, RoadList } from '@/types/roadList';
import RoadListTable from '@/components/RoadListTable';
import RoadListForm from '@/components/RoadListForm';
import { onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

const RoadLists: FC = () => {
    const loading = useStore(state => state.loading);
    const selectedVehicle = useStore(state => state.selectedVehicle);
    const setSelectedVehicle = useStore(state => state.setSelectedVehicle);
    const getByVehicle = useStore(state => state.getByVehicle);
    const getById = useStore(state => state.getById);
    const deleteRoadList = useStore(state => state.delete);
    const fetchAll = useStore(state => state.fetchAll);

    const vehicles = useVehicleStore(state => state.activeVehicles);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadingRef = useRef(loading);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        let isInitial = true;

        const unsub = onSnapshot(collection(db, "road-lists"), snap => {
            if (isInitial) {
                isInitial = false;
                return;
            }

            if (!loadingRef.current) {
                fetchAll();
            }
        });

        return () => unsub();
    }, []);

    // Set initial selected vehicle if none selected
    useEffect(() => {
        if (!selectedVehicle && vehicles.length > 0) {
            setSelectedVehicle(vehicles[0].id);
        }
    }, [selectedVehicle, vehicles, setSelectedVehicle]);

    const roadLists = selectedVehicle ? getByVehicle(selectedVehicle) : [];

    const editingRoadList = useMemo<RoadList | null>(() => {
        if (editingId) {
            return getById(editingId) ?? null;
        }

        if (!selectedVehicle) return null;

        const vehicleConfig = useVehicleStore.getState().vehicles.find(v => v.id === selectedVehicle);
        if (!vehicleConfig) return null;

        // Creating new roadlist
        const lastRoadList = roadLists[roadLists.length - 1];
        const modes = getModes(vehicleConfig);

        const newItinerary: Itinerary = {
            date: new Date(),
            br: null,
            fuel: null,
            comment: '',
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
            vehicle: selectedVehicle,
            start: new Date(),
            end: new Date(),
            startFuel: lastRoadList?.cumulativeFuel ?? 0,
            startHours: initialStartHours,
            itineraries: [newItinerary],
        };
    }, [editingId, roadLists, selectedVehicle, getById]);

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
        if (deletingId && selectedVehicle) {
            await deleteRoadList(deletingId, selectedVehicle);
            setIsDeleteOpen(false);
            setDeletingId(null);
        }
    };

    if (vehicles.length === 0) {
        return (
            <Card.Root>
                <Card.Body>
                    <p>No vehicles configured. Please add vehicles first.</p>
                </Card.Body>
            </Card.Root>
        );
    }

    return (
        <VStack alignItems="stretch">
            <Card.Root>
                <Card.Header>Дорожні листи</Card.Header>
                <Card.Body>
                    <Tabs.Root
                        value={selectedVehicle || undefined}
                        onValueChange={(e) => setSelectedVehicle(e.value as Vehicle)}
                    >
                        <Tabs.List>
                            {vehicles.map(vehicle => (
                                <Tabs.Trigger key={vehicle.id} value={vehicle.id}>
                                    {vehicle.name}
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>

                        {vehicles.map(vehicle => (
                            <Tabs.Content key={vehicle.id} value={vehicle.id}>
                                <RoadListTable
                                    loading={loading}
                                    roadLists={roadLists}
                                    onOpen={handleOpenForm}
                                    onDelete={handleOpenDelete}
                                />
                            </Tabs.Content>
                        ))}
                    </Tabs.Root>
                </Card.Body>
                <Card.Footer>
                    <Button variant="outline" size="sm" onClick={() => handleOpenForm()}>
                        Додати лист
                    </Button>
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
                                {editingRoadList && (
                                    <RoadListForm
                                        roadList={editingRoadList}
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