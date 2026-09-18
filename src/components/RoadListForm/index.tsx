// src/components/RoadListForm/index.tsx

'use client';
import {FC, PropsWithChildren, useEffect, useRef} from 'react';
import {DndContext, closestCenter, UniqueIdentifier} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import {Button, Grid, Alert, GridItem, Heading, HStack, IconButton, Separator, Text, VStack} from '@chakra-ui/react';
import {BiPlus, BiMenu, BiSolidWrench} from 'react-icons/bi';
import { CalculatedItinerary, EngineHours, Itinerary, RoadList } from '@/types/roadList';
import { getModes, isBoat } from '@/types/vehicle';
import { calculateRoadList } from '@/lib/calculations';
import { useStore } from '@/lib/store';
import { useVehicleStore, selectVehicleById } from '@/lib/vehicleStore';
import RoadListHeader from '@/components/RoadListHeader';
import ItineraryRow from '@/components/ItineraryRow';
import Summary from '@/components/Summary';
import type { Balance } from '@/components/RoadLists';
import type {DragEndEvent} from "@dnd-kit/core/dist/types";

type Props = {
    roadList: RoadList;
    // The balance carried in from the previous road list, or null when this road
    // list opens the chain.
    carried: Balance | null;
    onClose: () => void;
}

type SortableItemProps = PropsWithChildren<{
  id: UniqueIdentifier;
  index: number;
    totalColumns: number;
}>

const SortableItem: FC<SortableItemProps> = ({ id, children, totalColumns }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Grid ref={setNodeRef} style={style} templateColumns="subgrid" gridColumn={`span ${totalColumns}`}>
            <GridItem alignSelf="center">
                <IconButton size="xs" variant="ghost" cursor="move" {...attributes} {...listeners}>
                    <BiMenu />
                </IconButton>
            </GridItem>
            {children}
        </Grid>
    );
}

function sameEngineHours(a: unknown, b: unknown): boolean {
    return typeof a === 'object' && a !== null && typeof b === 'object' && b !== null
        && (a as EngineHours).left === (b as EngineHours).left
        && (a as EngineHours).right === (b as EngineHours).right;
}

// Rows are recalculated from scratch on every keystroke, so an untouched row would
// otherwise arrive at ItineraryRow as a new object and re-render a DatePicker, a
// file upload and a popover for nothing. Compare by value and keep the old object.
function sameRow(a: CalculatedItinerary, b: CalculatedItinerary): boolean {
    const keys = Object.keys(b);
    if (keys.length !== Object.keys(a).length) return false;

    return keys.every(key => {
        const left = (a as Record<string, unknown>)[key];
        const right = (b as Record<string, unknown>)[key];

        if (left === right) return true;
        if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
        if (Array.isArray(left) && Array.isArray(right)) {
            return left.length === right.length && left.every((item, i) => item === right[i]);
        }
        return sameEngineHours(left, right);
    });
}

const RoadListForm: FC<Props> = ({ roadList, carried, onClose }) => {
    const upsert = useStore(state => state.upsert);

    const vehicleConfig = useVehicleStore(state => selectVehicleById(state, roadList.vehicle));

    const modes = getModes(vehicleConfig);

    const methods = useForm<RoadList>({
        defaultValues: roadList,
    });

    const { control, handleSubmit, reset, watch } = methods;
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: 'itineraries'
    });

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over?.id && active.id !== over?.id) {
            const oldIndex = fields.findIndex((field) => field.id === active.id);
            const newIndex = fields.findIndex((field) => field.id === over.id);
            move(oldIndex, newIndex); // Update react-hook-form's state
        }
    };

    // Watch form values
    const itineraries = watch('itineraries');
    const startFuel = watch('startFuel');
    const startHours = watch('startHours');
    const resetBalance = watch('resetBalance');

    // The balance is carried forward unless this road list opens the chain or the
    // user has explicitly chosen to set it by hand.
    const carriedIn = carried && !resetBalance ? carried : null;
    const openingFuel = carriedIn ? carriedIn.fuel : startFuel;
    const openingHours = carriedIn ? carriedIn.hours : startHours;

    // Calculating one road list costs microseconds, so it runs inline on every
    // render — no debounce, and the totals never disagree with what is on screen.
    const calculated = calculateRoadList(
        { ...roadList, itineraries, startFuel: openingFuel, startHours: openingHours },
        vehicleConfig
    );

    const rowsRef = useRef<CalculatedItinerary[]>([]);
    const calculatedRows: CalculatedItinerary[] = calculated.itineraries;
    const rows = calculatedRows.map((row, index) => {
        const previous = rowsRef.current[index];
        return previous && sameRow(previous, row) ? previous : row;
    });
    rowsRef.current = rows;

    useEffect(() => {
        reset(roadList);
    }, [roadList.id, reset]);

    const onSubmit = async (data: RoadList) => {
        const dates = data.itineraries.map(it => it.date.getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);

        try {
            await upsert({
                ...data,
                // Persist the opening balance that was actually in effect. It is only
                // read back when this road list opens the chain or resets it.
                startFuel: openingFuel,
                startHours: openingHours,
                start: new Date(minDate),
                end: new Date(maxDate),
            });

            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    const handleAppend = (maintenance = false) => {
        const lastDate = fields.length > 0
            ? new Date(fields[fields.length - 1].date)
            : new Date();

        lastDate.setDate(lastDate.getDate() + 1);

        const newItinerary: Itinerary = {
            date: lastDate,
            br: null,
            fuel: null,
            comment: '',
            maintenance,
            startTime: '09:00'
        };

        // Add vehicle-specific fields
        modes.forEach(mode => {
            // @ts-expect-error: dynamic keys
            newItinerary[mode.id] = null;
        });

        append(newItinerary);
    };

    // Calculate grid columns: 3 base + modes + 7 additional
    const totalColumns = 2 + 3 + modes.length + (isBoat(vehicleConfig) ? 7 : 6);

    return (
        <FormProvider {...methods}>
            <form id="upsert" onSubmit={handleSubmit(onSubmit)}>
                <VStack alignItems="stretch" gap={4}>
                    <RoadListHeader vehicle={roadList.vehicle} carried={carried} />

                    <Alert.Root status="info">
                        <Alert.Indicator />
                        <Alert.Content>
                            <Alert.Title>Не забудьте зберегти внесені зміни</Alert.Title>
                        </Alert.Content>
                    </Alert.Root>

                    <HStack>
                        <Separator flex="1" />
                        <Text flexShrink="0" textStyle="md" fontWeight="bold">Записи</Text>
                        <Separator flex="1" />
                    </HStack>

                    <Grid
                        templateColumns={`min-content repeat(3, 6em) repeat(${modes.length}, ${isBoat(vehicleConfig) ? '6.5em' : '5em'}) repeat(4, 5em) ${isBoat(vehicleConfig) ? 'min-content min-content min-content auto' : 'min-content auto'}`}
                        gap={2}
                    >
                        {/* Column Headers */}
                        <Grid templateColumns="subgrid" gridColumn={`span ${totalColumns}`}>
                            <GridItem colStart={2}><Heading size="xs">Дата</Heading></GridItem>
                            <GridItem><Heading size="xs">БР</Heading></GridItem>
                            <GridItem><Heading size="xs">Бункеровка</Heading></GridItem>

                            {modes.map(mode => (
                                <GridItem key={mode.id}>
                                    <Heading size="xs">{mode.label}</Heading>
                                </GridItem>
                            ))}

                            <GridItem><Heading size="xs">Усього</Heading></GridItem>
                            <GridItem><Heading size="xs">Розхід</Heading></GridItem>
                            <GridItem><Heading size="xs">Залишок</Heading></GridItem>
                            {isBoat(vehicleConfig) ? (
                                <>
                                    <GridItem><Heading size="xs" className="whitespace-nowrap">Л двигун</Heading></GridItem>
                                    <GridItem><Heading size="xs" className="whitespace-nowrap">П двигун</Heading></GridItem>
                                </>
                            ) : <GridItem><Heading size="xs">Одометр</Heading></GridItem>}
                            <GridItem>
                                <Heading size="xs">Файли</Heading>
                            </GridItem>
                            <GridItem>
                                <Heading size="xs">Таймінг</Heading>
                            </GridItem>
                            <GridItem><Heading size="xs">Коментар</Heading></GridItem>
                        </Grid>

                        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={fields} strategy={verticalListSortingStrategy}>
                                {/* Itinerary Rows */}
                                {fields.map((field, index) => (
                                    <SortableItem totalColumns={totalColumns} key={field.id} id={field.id} index={index}>
                                        <ItineraryRow
                                            key={field.id}
                                            index={index}
                                            vehicle={roadList.vehicle}
                                            calculated={rows[index]}
                                            onRemove={remove}
                                            isLast={index === fields.length - 1}
                                        />
                                    </SortableItem>
                                ))}
                            </SortableContext>
                        </DndContext>

                        {/* Summary Row */}
                        <Summary calculated={calculated} vehicle={roadList.vehicle} />
                    </Grid>

                    <VStack align="stretch">
                        <HStack>
                            <Button colorPalette="blue" size="xs" onClick={() => handleAppend()}>
                                <BiPlus /> Додати запис
                            </Button>
                            <Button colorPalette="green" size="xs" onClick={() => handleAppend(true)}>
                                <BiSolidWrench /> Додати ТО
                            </Button>
                        </HStack>
                    </VStack>
                </VStack>
            </form>
        </FormProvider>
    );
};

export default RoadListForm;
