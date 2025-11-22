'use client';
import { FC, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { Button, Grid, GridItem, Heading, HStack, Separator, Text, VStack } from '@chakra-ui/react';
import { BiPlus } from 'react-icons/bi';
import {Itinerary, RoadList} from '@/types/roadList';
import { VEHICLE_CONFIG, getModes } from '@/types/vehicle';
import { calculateRoadList } from '@/lib/calculations';
import { useStore } from '@/lib/store';
import RoadListHeader from '@/components/RoadListHeader';
import ItineraryRow from '@/components/ItineraryRow';
import Summary from '@/components/Summary';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

type Props = {
    roadList: RoadList;
    onClose: () => void;
}

const RoadListForm: FC<Props> = ({ roadList, onClose }) => {
    const upsert = useStore(state => state.upsert);
    const config = VEHICLE_CONFIG[roadList.vehicle];
    const modes = getModes(roadList.vehicle);

    const methods = useForm<RoadList>({
        defaultValues: roadList,
    });

    const { control, handleSubmit, reset, watch } = methods;
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'itineraries'
    });

    // Watch form values
    const formValues = watch();

    // Debounce calculations (100ms delay)
    const debouncedValues = useDebouncedValue(formValues, 100);

    // Calculate with debounced values
    const calculated = useMemo(() => {
        return calculateRoadList(debouncedValues);
    }, [debouncedValues]);

    useEffect(() => {
        reset(roadList);
    }, [roadList.id, reset]);

    const onSubmit = async (data: RoadList) => {
        const dates = data.itineraries.map(it => it.date.getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);

        await upsert({
            ...data,
            start: new Date(minDate),
            end: new Date(maxDate),
        });

        onClose();
    };

    const handleAppend = () => {
        const lastDate = fields.length > 0
            ? new Date(fields[fields.length - 1].date)
            : new Date();

        lastDate.setDate(lastDate.getDate() + 1);

        const newItinerary: Itinerary = {
            date: lastDate,
            br: null,
            fuel: null,
            comment: '',
        };

        // Add vehicle-specific fields
        modes.forEach(mode => {
            newItinerary[mode] = null;
        });

        append(newItinerary);
    };

    // Calculate grid columns: 3 base + modes + 5 additional
    const totalColumns = 3 + modes.length + 5;

    return (
        <FormProvider {...methods}>
            <form id="upsert" onSubmit={handleSubmit(onSubmit)}>
                <VStack alignItems="stretch" gap={4}>
                    <RoadListHeader vehicle={roadList.vehicle} />

                    <HStack>
                        <Separator flex="1" />
                        <Text flexShrink="0" textStyle="md" fontWeight="bold">Записи</Text>
                        <Separator flex="1" />
                    </HStack>

                    <Grid
                        templateColumns={`repeat(3, 6em) repeat(${modes.length}, 5.5em) repeat(5, 5em) auto`}
                        gap={2}
                    >
                        {/* Column Headers */}
                        <Grid templateColumns="subgrid" gridColumn={`span ${totalColumns}`}>
                            <GridItem><Heading size="sm">Дата</Heading></GridItem>
                            <GridItem><Heading size="sm">БР</Heading></GridItem>
                            <GridItem><Heading size="sm">Бункеровка</Heading></GridItem>

                            {modes.map(mode => (
                                <GridItem key={mode}>
                                    <Heading size="sm">{config.labels[mode]}</Heading>
                                </GridItem>
                            ))}

                            <GridItem><Heading size="sm">Усього</Heading></GridItem>
                            <GridItem><Heading size="sm">Розхід</Heading></GridItem>
                            <GridItem><Heading size="sm">Залишок</Heading></GridItem>
                            <GridItem><Heading size="sm">Л Мотор</Heading></GridItem>
                            <GridItem><Heading size="sm">П Мотор</Heading></GridItem>
                            <GridItem><Heading size="sm">Коментар</Heading></GridItem>
                        </Grid>

                        {/* Itinerary Rows */}
                        {fields.map((field, index) => (
                            <ItineraryRow
                                key={field.id}
                                index={index}
                                vehicle={roadList.vehicle}
                                calculated={calculated.itineraries[index]}
                                onRemove={() => remove(index)}
                                isLast={index === fields.length - 1}
                            />
                        ))}

                        {/* Summary Row */}
                        <Summary calculated={calculated} vehicle={roadList.vehicle} />
                    </Grid>

                    <HStack>
                        <Button colorPalette="blue" size="xs" onClick={handleAppend}>
                            <BiPlus /> Додати запис
                        </Button>
                    </HStack>
                </VStack>
            </form>
        </FormProvider>
    );
};

export default RoadListForm;