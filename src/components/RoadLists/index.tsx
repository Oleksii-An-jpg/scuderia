'use client';
import {FC, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {getAllRoadListsNext, Vehicle} from "@/db";
import {
    Badge,
    Button,
    Card,
    CloseButton,
    Dialog,
    Heading,
    Portal,
    Table, Text,
    VStack
} from "@chakra-ui/react";
import {useForm} from "react-hook-form";
import {MambaRoadList, RoadListModel} from "@/models";
import {useBoolean} from "react-use";
import Mamba, {decimalToTimeString} from "@/components/RoadLists/Mamba";

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

    const { watch } = useForm<Values>({
        defaultValues: {
            vehicle: Vehicle.MAMBA
        }
    });

    const vehicle = watch("vehicle");

    const byVehicle = model?.getByVehicle(vehicle);
    const { record } = useMemo(() => {
        const collection = model?.getByVehicle(vehicle);
        let record: MambaRoadList | undefined

        if (id) {
            record = collection?.byID.get(id);
        } else if (model) {
            const { total, startFuel } = model.getAccumulatedValues()
            record = {
                startFuel,
                total,
                start: new Date(),
                end: new Date(),
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
                startHours: total,
                currentHours: 0,
                consumedFuel: 0,
            } as MambaRoadList
        }

        return { record };
    }, [vehicle, id]);
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
                {loading ? "Loading..." : <>
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>
                                    <Heading size="sm">Період</Heading>
                                </Table.ColumnHeader>
                                <Table.ColumnHeader>
                                    <Heading size="sm">Загальна тривалість</Heading>
                                </Table.ColumnHeader>
                                <Table.ColumnHeader colSpan={2}>
                                    <Heading size="sm">Загальний розхід</Heading>
                                </Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {byVehicle?.ids.map(id => {
                                const record = byVehicle.byID.get(id);
                                if (!record) return null;
                                return (
                                    <Table.Row key={id}>
                                        <Table.Cell>
                                            <Badge colorPalette="blue" size="lg">
                                                <Text fontWeight="bold">
                                                    {new Intl.DateTimeFormat('uk-UA', {
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        year: '2-digit'
                                                    }).format(record.start)} — {new Intl.DateTimeFormat('uk-UA', {
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    year: '2-digit'
                                                }).format(record.end)}
                                                </Text>
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Text fontWeight="bold">{decimalToTimeString(record.currentHours)}</Text>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Text fontWeight="bold">{record.consumedFuel}</Text>
                                        </Table.Cell>
                                        <Table.Cell textAlign="right">
                                            <Button size="xs" onClick={() => {
                                                setID(id);
                                                setOpen(true);
                                            }}>
                                                Переглянути
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                )
                            })}
                        </Table.Body>
                    </Table.Root>
                </>}
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
                            {record?.vehicle === Vehicle.MAMBA && <Mamba record={record} />}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline">Скасувати</Button>
                            </Dialog.ActionTrigger>
                            <Button form="upsert" type="submit">Зберегти</Button>
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