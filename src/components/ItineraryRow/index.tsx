'use client';
import { FC, memo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Badge, Field, Grid, GridItem, HStack, IconButton, Input, Text, Textarea } from '@chakra-ui/react';
import DatePicker from 'react-datepicker';
import { BiTrash } from 'react-icons/bi';
import { RoadList, CalculatedItinerary } from '@/types/roadList';
import { Vehicle, VEHICLE_CONFIG, isBoat } from '@/types/vehicle';
import { decimalToTimeString } from '@/lib/timeUtils';
import TimeInput from '@/components/TimeInput';
import 'react-datepicker/dist/react-datepicker.css';

type Props = {
    index: number;
    vehicle: Vehicle;
    calculated: CalculatedItinerary;
    onRemove: () => void;
    isLast: boolean;
}

const ItineraryRow: FC<Props> = ({ index, vehicle, calculated, onRemove, isLast }) => {
    const { control, register } = useFormContext<RoadList>();
    const config = VEHICLE_CONFIG[vehicle];
    const modes = config.type === 'boat' ? config.speedModes : config.terrainModes;

    // Calculate column span: 3 (date, br, fuel) + modes.length + 6 (total, consumed, cumFuel, L motor, P motor, comment)
    const totalColumns = 3 + modes.length + 6;

    return (
        <Grid templateColumns="subgrid" gridColumn={`span ${totalColumns}`}>
            {/* Date */}
            <GridItem>
                <Field.Root>
                    <Controller
                        name={`itineraries.${index}.date`}
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                popperPlacement="top-end"
                                dateFormat="dd/MM/yyyy"
                                selected={field.value}
                                onChange={field.onChange}
                                customInput={<Input variant="subtle" name={field.name} size="2xs" />}
                            />
                        )}
                    />
                </Field.Root>
            </GridItem>

            {/* BR */}
            <GridItem>
                <Field.Root>
                    <Input
                        autoComplete="off"
                        type="number"
                        min={0}
                        step={1}
                        size="2xs"
                        {...register(`itineraries.${index}.br`, { valueAsNumber: true })}
                    />
                </Field.Root>
            </GridItem>

            {/* Fuel */}
            <GridItem>
                <Field.Root>
                    <Input
                        autoComplete="off"
                        type="number"
                        step={1}
                        size="2xs"
                        {...register(`itineraries.${index}.fuel`, { valueAsNumber: true })}
                    />
                </Field.Root>
            </GridItem>

            {/* Dynamic mode fields */}
            {modes.map(mode => (
                <GridItem key={mode}>
                    <Field.Root>
                        {isBoat(vehicle) ? (
                            <TimeInput name={`itineraries.${index}.${mode}`} control={control} />
                        ) : (
                            <Input
                                autoComplete="off"
                                type="number"
                                step={0.1}
                                size="2xs"
                                {...register(`itineraries.${index}.${mode}`, { valueAsNumber: true })}
                            />
                        )}
                    </Field.Root>
                </GridItem>
            ))}

            {/* Total (rowHours) */}
            <GridItem>
                <Field.Root invalid={isBoat(vehicle) && calculated.rowHours != null && Math.round(calculated.rowHours * 60) % 6 !== 0}>
                    <Input
                        disabled
                        size="2xs"
                        variant="subtle"
                        value={isBoat(vehicle) ? decimalToTimeString(calculated.rowHours) : Math.round(calculated.rowHours)}
                    />
                </Field.Root>
            </GridItem>

            {/* Consumed */}
            <GridItem alignSelf="center">
                <Text textStyle="sm">{Math.round(calculated.rowConsumed)}</Text>
            </GridItem>

            {/* Cumulative Fuel */}
            <GridItem alignSelf="center">
                <Text textStyle="sm" {...(isLast && { fontWeight: 'bold' })}>
                    {Math.round(calculated.cumulativeFuel)}
                </Text>
            </GridItem>

            {/* L Motor */}
            <GridItem alignSelf="center">
                <Badge colorPalette="purple" size="lg">
                    <Text fontWeight="bold">{Math.round(calculated.cumulativeHours * 10) / 10}</Text>
                </Badge>
            </GridItem>

            {/* P Motor */}
            <GridItem alignSelf="center">
                <Badge colorPalette="purple" size="lg">
                    <Text fontWeight="bold">{Math.round(calculated.cumulativeHours * 10) / 10}</Text>
                </Badge>
            </GridItem>

            {/* Comment & Delete */}
            <GridItem>
                <HStack>
                    <Field.Root>
                        <Textarea
                            maxH="2lh"
                            resize="none"
                            size="xs"
                            {...register(`itineraries.${index}.comment`)}
                        />
                    </Field.Root>
                    <IconButton
                        onClick={onRemove}
                        size="xs"
                        colorPalette="red"
                        variant="outline"
                        aria-label="Видалити"
                    >
                        <BiTrash />
                    </IconButton>
                </HStack>
            </GridItem>
        </Grid>
    );
};

export default memo(ItineraryRow);