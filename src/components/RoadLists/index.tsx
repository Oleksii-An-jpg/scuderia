'use client';
import {FC, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {getAllRoadListsNext, Vehicle} from "@/db";
import {
    Button,
    Card,
    CloseButton,
    Dialog,
    Heading,
    Portal,
    Tabs,
    VStack
} from "@chakra-ui/react";
import {Controller, useForm} from "react-hook-form";
import {KMARRoadList, MambaRoadList, RoadListModel} from "@/models";
import {useBoolean} from "react-use";
import Mamba from "@/components/RoadLists/Mamba";
import KMAR from "@/components/RoadLists/KMAR";
import Records from "@/components/RoadLists/Records";

type Values = {
    vehicle: Vehicle
}

const RoadLists: FC = () => {
    const [model, setModel] = useState<RoadListModel>();
    const [loading, setLoading] = useBoolean(false);
    const [id, setID] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const sync = useCallback(async () => {
        setLoading(true);
        const result = await getAllRoadListsNext();
        setModel(result);
        setLoading(false);
    }, []);

    const { watch, control } = useForm<Values>({
        defaultValues: {
            vehicle: Vehicle.MAMBA
        }
    });

    const vehicle = watch("vehicle");

    const byVehicle = model?.getByVehicle(vehicle);
    const { record } = useMemo(() => {
        const collection = model?.getByVehicle(vehicle);
        let record: MambaRoadList | KMARRoadList | undefined

        if (id) {
            record = collection?.byID.get(id);
        } else if (model) {
            const { total, startFuel } = model.getAccumulatedValues(vehicle);
            record = {
                startFuel,
                total,
                start: new Date(),
                end: new Date(),
                vehicle,
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
                startHours: total,
                currentHours: 0,
                consumedFuel: 0,
            } as MambaRoadList
        }

        return { record };
    }, [vehicle, id, model]);
    useEffect(() => {
        sync();
    }, []);
    const ref = useRef<HTMLDivElement | null>(null);
    return <VStack alignItems="stretch">
        <Card.Root>
            <Card.Header>
                <Heading size="md">Дорожні листи</Heading>
            </Card.Header>
            <Card.Body>
                <Controller control={control} render={({ field: { value, onChange } }) => <Tabs.Root value={value} onValueChange={(e) => onChange(e.value)}>
                    <Tabs.List>
                        <Tabs.Trigger value={Vehicle.MAMBA}>
                            Mamba
                        </Tabs.Trigger>
                        <Tabs.Trigger value={Vehicle.KMAR}>
                            KMAR
                        </Tabs.Trigger>
                    </Tabs.List>
                    {loading ? "Loading..." : <>
                        <Tabs.Content value={Vehicle.MAMBA}>
                            <Records byVehicle={byVehicle} onOpen={(id: string) => {
                                setID(id);
                                setOpen(true);
                            }} />
                        </Tabs.Content>
                        <Tabs.Content value={Vehicle.KMAR}>
                            <Records byVehicle={byVehicle} onOpen={(id: string) => {
                                setID(id);
                                setOpen(true);
                            }} />
                        </Tabs.Content>
                    </>}
                </Tabs.Root>} name="vehicle" />
            </Card.Body>
            <Card.Footer>
                <Button variant="outline" size="sm" onClick={() => {
                    setOpen(true);
                    setID(null);
                }}>Додати лист</Button>
            </Card.Footer>
        </Card.Root>
        <Dialog.Root size="cover" initialFocusEl={() => ref.current} lazyMount open={open} onOpenChange={(e) => setOpen(e.open)}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content ref={ref}>
                        <Dialog.Header>
                            <Dialog.Title>Дорожній лист від {new Intl.DateTimeFormat('uk-UA', {
                                month: '2-digit',
                                day: '2-digit',
                                year: '2-digit'
                            }).format(record?.start)} по {new Intl.DateTimeFormat('uk-UA', {
                                month: '2-digit',
                                day: '2-digit',
                                year: '2-digit'
                            }).format(record?.end)}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            {record?.vehicle === Vehicle.MAMBA && <Mamba onSubmit={sync} record={record} />}
                            {record?.vehicle === Vehicle.KMAR && <KMAR onSubmit={sync} record={record} />}
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
    </VStack>
}

export default RoadLists;