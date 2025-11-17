'use client';
import {FC, useCallback, useEffect, useMemo, useRef, useState, memo} from "react";
import {deleteDoc, getAllRoadListsNext, RoadListStore} from "@/db";
import {Card, VStack, Tabs, Dialog, Portal, Button, CloseButton} from "@chakra-ui/react";
import {useBoolean} from "usehooks-ts";
import {AppType, KMARRoadListAppModel, MambaRoadListAppModel, Vehicle} from "@/models/mamba";
import {Controller, useForm} from "react-hook-form";
import {calculateCumulative} from "@/calculator";
import Records from "@/components/RoadLists/Records";
import MambaNext from "@/components/RoadLists/MambaNext";
import KMARNext from "@/components/RoadLists/KMARNext";
import F250Next from "@/components/RoadLists/F250Next";
import MasterNext from "@/components/RoadLists/MasterNext";

type Values = {
    vehicle: Vehicle
}

const RoadLists: FC = () => {
    const [store, setStore] = useState<RoadListStore>();
    const { value: loading, setValue: setLoading } = useBoolean(true);
    const { handleSubmit, formState: { isSubmitting } } = useForm()
    const [id, setID] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false)
    const sync = useCallback(async () => {
        setLoading(true)
        const result = await getAllRoadListsNext();
        setStore(result);
        setLoading(false);
    }, []);

    const { watch, control } = useForm<Values>({
        defaultValues: {
            vehicle: Vehicle.MAMBA
        }
    });

    const vehicle = watch("vehicle");

    const byVehicle = useMemo(() => store?.getByVehicle(vehicle).map(calculateCumulative).filter(m => m != null), [store, vehicle]);
    const model: AppType | undefined = useMemo(() => {
        if (id) {
            return store?.getById(id);
        } else if (byVehicle) {
            const last = byVehicle[byVehicle.length - 1];
            const model = {
                startFuel: last?.cumulativeFuel,
                startHours: last?.cumulativeHours,
                start: new Date(),
                end: new Date(),
            }
            if (vehicle === Vehicle.MAMBA) {
                return {
                    ...model,
                    vehicle: Vehicle.MAMBA,
                    itineraries: [{
                        date: new Date(),
                        br: null,
                        fuel: null,
                        sh: null,
                        hh: null,
                        mh: null,
                        ph: null,
                        total: null,
                        comment: undefined,
                    }],
                } as unknown as MambaRoadListAppModel
            } else if (vehicle === Vehicle.KMAR) {
                return {
                    ...model,
                    vehicle,
                    itineraries: [{
                        date: new Date(),
                        br: null,
                        fuel: null,
                        sh: null,
                        hh: null,
                        mh: null,
                        total: null,
                        comment: undefined,
                    }],
                } as unknown as KMARRoadListAppModel
            } else if (vehicle === Vehicle.F250 || vehicle === Vehicle.MASTER) {
                return {
                    ...model,
                    vehicle,
                    itineraries: [{
                        date: new Date(),
                        br: null,
                        fuel: null,
                        hours: null,
                        t: null,
                        comment: undefined,
                    }],
                } as unknown as KMARRoadListAppModel
            }
        }
    }, [id, vehicle, byVehicle]);
    useEffect(() => {
        sync();
    }, []);
    const ref = useRef<HTMLDivElement | null>(null);
    return <VStack alignItems="stretch">
        <Card.Root>
            <Card.Header>Дорожні листи</Card.Header>
            <Card.Body>
                <Controller control={control} render={({ field: { value, onChange } }) => <Tabs.Root value={value} onValueChange={(e) => onChange(e.value)}>
                    <Tabs.List>
                        <Tabs.Trigger value={Vehicle.MAMBA}>
                            Mamba
                        </Tabs.Trigger>
                        <Tabs.Trigger value={Vehicle.KMAR}>
                            KMAR
                        </Tabs.Trigger>
                        <Tabs.Trigger value={Vehicle.F250}>
                            Ford F250
                        </Tabs.Trigger>
                        <Tabs.Trigger value={Vehicle.MASTER}>
                            Renault Master
                        </Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value={Vehicle.MAMBA}>
                        <Records loading={loading} models={byVehicle} onOpen={(id) => {
                            setID(id);
                            setOpen(true);
                        }} onDelete={(id) => {
                            setID(id);
                            setDeleteOpen(true)
                        }} />
                    </Tabs.Content>
                    <Tabs.Content value={Vehicle.KMAR}>
                        <Records loading={loading} models={byVehicle} onOpen={(id: string) => {
                            setID(id);
                            setOpen(true);
                        }} onDelete={(id) => {
                            setID(id);
                            setDeleteOpen(true)
                        }} />
                    </Tabs.Content>
                    <Tabs.Content value={Vehicle.F250}>
                        <Records loading={loading} models={byVehicle} onOpen={(id: string) => {
                            setID(id);
                            setOpen(true);
                        }} onDelete={(id) => {
                            setID(id);
                            setDeleteOpen(true)
                        }} />
                    </Tabs.Content>
                    <Tabs.Content value={Vehicle.MASTER}>
                        <Records loading={loading} models={byVehicle} onOpen={(id: string) => {
                            setID(id);
                            setOpen(true);
                        }} onDelete={(id) => {
                            setID(id);
                            setDeleteOpen(true)
                        }} />
                    </Tabs.Content>
                </Tabs.Root>} name="vehicle" />
            </Card.Body>
            <Card.Footer>
                <Button variant="outline" size="sm" onClick={() => {
                    setOpen(true);
                    setID(null);
                }}>Додати лист</Button>
            </Card.Footer>
        </Card.Root>
        <Dialog.Root scrollBehavior="inside" size="cover" initialFocusEl={() => ref.current} lazyMount open={open} onOpenChange={(e) => setOpen(e.open)}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content ref={ref} maxH="100%">
                        <Dialog.Header>
                            <Dialog.Title>Дорожній лист від {new Intl.DateTimeFormat('uk-UA', {
                                month: '2-digit',
                                day: '2-digit',
                                year: '2-digit'
                            }).format(model?.start)} по {new Intl.DateTimeFormat('uk-UA', {
                                month: '2-digit',
                                day: '2-digit',
                                year: '2-digit'
                            }).format(model?.end)}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body height={100}>
                            {model?.vehicle === Vehicle.MAMBA && <MambaNext onBeforeSubmit={() => {
                                setLoading(true);
                            }} onAfterSubmit={async () => {
                                await sync();
                                setLoading(false);
                                setOpen(false);
                            }} model={model} />}
                            {model?.vehicle === Vehicle.KMAR && <KMARNext onBeforeSubmit={() => {
                                setLoading(true);
                            }} onAfterSubmit={async () => {
                                await sync();
                                setLoading(false);
                                setOpen(false);
                            }} model={model} />}
                            {model?.vehicle === Vehicle.F250 && <F250Next onBeforeSubmit={() => {
                                setLoading(true);
                            }} onAfterSubmit={async () => {
                                await sync();
                                setLoading(false);
                                setOpen(false);
                            }} model={model} />}
                            {model?.vehicle === Vehicle.MASTER && <MasterNext onBeforeSubmit={() => {
                                setLoading(true);
                            }} onAfterSubmit={async () => {
                                await sync();
                                setLoading(false);
                                setOpen(false);
                            }} model={model} />}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline">Скасувати</Button>
                            </Dialog.ActionTrigger>
                            <Button loading={loading} form="upsert" type="submit">Зберегти</Button>
                        </Dialog.Footer>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" />
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>

        <Dialog.Root role="alertdialog" open={deleteOpen} onOpenChange={(e) => setDeleteOpen(e.open)}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxH="100%">
                        <Dialog.Header>
                            <Dialog.Title>Видалити дорожній лист від {new Intl.DateTimeFormat('uk-UA', {
                                month: '2-digit',
                                day: '2-digit',
                                year: '2-digit'
                            }).format(model?.start)} по {new Intl.DateTimeFormat('uk-UA', {
                                month: '2-digit',
                                day: '2-digit',
                                year: '2-digit'
                            }).format(model?.end)}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            Цю дію неможливо скасувати. Це призведе до остаточного видалення дорожнього листу з системи.
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline">Скасувати</Button>
                            </Dialog.ActionTrigger>
                            <form onSubmit={handleSubmit(async () => {
                                if (model) {
                                    await deleteDoc(model.id, model.vehicle);
                                    await sync();
                                    setDeleteOpen(false);
                                }
                            })}>
                                <Button colorPalette="red" loading={isSubmitting} type="submit">Видалити</Button>
                            </form>
                        </Dialog.Footer>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" />
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    </VStack>
}

export default memo(RoadLists);