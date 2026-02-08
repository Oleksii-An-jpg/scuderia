// src/components/RoadListForm/index.tsx

'use client';
import {FC, PropsWithChildren, useEffect, useMemo} from 'react';
import {DndContext, closestCenter, UniqueIdentifier} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import {Button, Grid, Alert, GridItem, Heading, HStack, IconButton, Separator, Text, VStack} from '@chakra-ui/react';
import {BiPlus, BiMenu, BiSolidWrench} from 'react-icons/bi';
import { Itinerary, RoadList } from '@/types/roadList';
import { getModes, isBoat } from '@/types/vehicle';
import { calculateRoadList } from '@/lib/calculations';
import { useStore } from '@/lib/store';
import { useVehicleStore, selectVehicleById } from '@/lib/vehicleStore';
import RoadListHeader from '@/components/RoadListHeader';
import ItineraryRow from '@/components/ItineraryRow';
import Summary from '@/components/Summary';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type {DragEndEvent} from "@dnd-kit/core/dist/types";

type Props = {
    roadList: RoadList;
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

const RoadListForm: FC<Props> = ({ roadList, onClose }) => {
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
    const itinerariesKey = JSON.stringify(itineraries);

    // Create stable object with useMemo
    const calculationInput = useMemo(() => ({
        ...roadList,
        itineraries,
        startFuel,
        startHours,
    }), [itinerariesKey, startFuel, typeof startHours === 'object' ? startHours.left : startHours, typeof startHours === 'object' ? startHours.right : startHours, roadList]);

    // Now debounce the STABLE input
    const debouncedInput = useDebouncedValue(calculationInput, 200);

    // Calculate with debounced values
    const calculated = useMemo(() => {
        return calculateRoadList(debouncedInput, vehicleConfig);
    }, [debouncedInput, vehicleConfig]);

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
            maintenance
        };

        // Add vehicle-specific fields
        modes.forEach(mode => {
            // @ts-expect-error: dynamic keys
            newItinerary[mode.id] = null;
        });

        append(newItinerary);
    };

    // Calculate grid columns: 3 base + modes + 7 additional
    const totalColumns = 1 + 3 + modes.length + (isBoat(vehicleConfig) ? 7 : 6);

    return (
        <FormProvider {...methods}>
            <form id="upsert" onSubmit={handleSubmit(onSubmit)}>
                <VStack alignItems="stretch" gap={4}>
                    <RoadListHeader vehicle={roadList.vehicle} />

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
                        templateColumns={`min-content repeat(3, 6em) repeat(${modes.length}, ${isBoat(vehicleConfig) ? '6.5em' : '5em'}) repeat(4, 5em) ${isBoat(vehicleConfig) ? 'min-content min-content auto' : 'min-content auto'}`}
                        gap={2}
                    >
                        {/* Column Headers */}
                        <Grid templateColumns="subgrid" gridColumn={`span ${totalColumns}`}>
                            <GridItem colStart={2}><Heading size="sm">Дата</Heading></GridItem>
                            <GridItem><Heading size="sm">БР</Heading></GridItem>
                            <GridItem><Heading size="sm">Бункеровка</Heading></GridItem>

                            {modes.map(mode => (
                                <GridItem key={mode.id}>
                                    <Heading size="sm">{mode.label}</Heading>
                                </GridItem>
                            ))}

                            <GridItem><Heading size="sm">Усього</Heading></GridItem>
                            <GridItem><Heading size="sm">Розхід</Heading></GridItem>
                            <GridItem><Heading size="sm">Залишок</Heading></GridItem>
                            {isBoat(vehicleConfig) ? (
                                <>
                                    <GridItem><Heading size="sm" className="whitespace-nowrap">Л двигун</Heading></GridItem>
                                    <GridItem><Heading size="sm" className="whitespace-nowrap">П двигун</Heading></GridItem>
                                </>
                            ) : <GridItem><Heading size="sm">Одометр</Heading></GridItem>}
                            <GridItem>
                                <Heading size="sm">Файли</Heading>
                            </GridItem>
                            <GridItem><Heading size="sm">Коментар</Heading></GridItem>
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
                                            calculated={calculated.itineraries[index]}
                                            onRemove={() => remove(index)}
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