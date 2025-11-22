'use client';
import {FC, useMemo, useState} from 'react';
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
import { Vehicle, getModes } from '@/types/vehicle';
import {Itinerary, RoadList} from '@/types/roadList';
import RoadListTable from '@/components/RoadListTable';
import RoadListForm from '@/components/RoadListForm';

const RoadLists: FC = () => {
    const loading = useStore(state => state.loading);
    const selectedVehicle = useStore(state => state.selectedVehicle);
    const setSelectedVehicle = useStore(state => state.setSelectedVehicle);
    const getByVehicle = useStore(state => state.getByVehicle);
    const getById = useStore(state => state.getById);
    const deleteRoadList = useStore(state => state.delete);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const roadLists = getByVehicle(selectedVehicle);

    const editingRoadList = useMemo<RoadList | null>(() => {
        if (editingId) {
            return getById(editingId) ?? null;
        }

        // Creating new roadlist
        const lastRoadList = roadLists[roadLists.length - 1];
        const modes = getModes(selectedVehicle);

        const newItinerary: Itinerary = {
            date: new Date(),
            br: null,
            fuel: null,
            comment: '',
        };

        modes.forEach(mode => {
            newItinerary[mode] = null;
        });

        return {
            vehicle: selectedVehicle,
            start: new Date(),
            end: new Date(),
            startFuel: lastRoadList?.cumulativeFuel ?? 0,
            startHours: lastRoadList?.cumulativeHours ?? 0,
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
        if (deletingId) {
            await deleteRoadList(deletingId, selectedVehicle);
            setIsDeleteOpen(false);
            setDeletingId(null);
        }
    };

    return (
        <VStack alignItems="stretch">
            <Card.Root>
                <Card.Header>Дорожні листи</Card.Header>
                <Card.Body>
                    <Tabs.Root value={selectedVehicle} onValueChange={(e) => setSelectedVehicle(e.value as Vehicle)}>
                        <Tabs.List>
                            <Tabs.Trigger value={Vehicle.MAMBA}>Mamba</Tabs.Trigger>
                            <Tabs.Trigger value={Vehicle.KMAR}>KMAR</Tabs.Trigger>
                            <Tabs.Trigger value={Vehicle.F250}>Ford F250</Tabs.Trigger>
                            <Tabs.Trigger value={Vehicle.MASTER}>Renault Master</Tabs.Trigger>
                        </Tabs.List>

                        {Object.values(Vehicle).map(vehicle => (
                            <Tabs.Content key={vehicle} value={vehicle}>
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