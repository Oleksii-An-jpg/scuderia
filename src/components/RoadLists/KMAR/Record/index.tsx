'use client';
import {Controller, UseFieldArrayRemove, useFormContext, useWatch} from "react-hook-form";
import {FC, memo, useCallback, useEffect, useMemo} from "react";
import {KMARItinerary, KMARRoadList} from "@/models";
import {Badge, Field, Grid, GridItem, HStack, IconButton, Input, Text, Textarea} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import {BiTrash} from "react-icons/bi";
import {calculateConsumed, calculateHours} from "@/components/RoadLists/KMAR";
import TimeInput, {decimalToTimeString, timeStringToDecimal} from "@/components/TimeInput";

const useRecordCalculations = (
    currentItinerary: KMARItinerary,
    previousIt: KMARItinerary,
    startHours: number | null,
    startFuel: number | null,
    index: number
) => {
    return useMemo(() => {
        const { hh = 0, sh = 0, mh = 0, fuel = 0 } = currentItinerary || {};

        // Hours and fuel consumed for THIS record
        const currentHours = calculateHours(hh, mh, sh);
        const currentConsumed = calculateConsumed(hh, mh, sh);

        const cumulativeHours =
            index === 0 ? currentHours + (startHours || 0) : (previousIt?.hours || 0) + currentHours;

        const cumulativeRemain =
            (index === 0 ? startFuel || 0 : previousIt?.remain || 0) +
            (fuel || 0) -
            currentConsumed;

        return {
            total: currentHours,
            consumed: currentConsumed,
            hours: cumulativeHours,
            remain: Math.round(cumulativeRemain * 100) / 100
        };
    }, [currentItinerary, previousIt, startHours, startFuel, index]);
};

type RecordProps = {
    index: number;
    remove: UseFieldArrayRemove;
}

const Record: FC<RecordProps> = ({ index, remove }) => {
    const { control, register, setValue, formState: { errors } } = useFormContext<KMARRoadList>();

    const [startHours, startFuel] = useWatch({
        control,
        name: ['startHours', 'startFuel']
    });

    const currentItinerary = useWatch({
        control,
        name: `itineraries.${index}`
    });

    const previousIt = useWatch({
        control,
        name: `itineraries.${index - 1}`
    });

    const calculations = useRecordCalculations(currentItinerary, previousIt, startHours, startFuel, index);
    const { total, consumed, remain, hours } = calculations

    useEffect(() => {
        const timer = setTimeout(() => {
            setValue(`itineraries.${index}.total`, total, { shouldValidate: true });
            setValue(`itineraries.${index}.consumed`, consumed, { shouldValidate: false });
            setValue(`itineraries.${index}.remain`, remain, { shouldValidate: false });
            setValue(`itineraries.${index}.hours`, hours, { shouldValidate: false });
        }, 50); // Small debounce to batch updates

        return () => clearTimeout(timer);
    }, [total, consumed, remain, hours, setValue, index]);

    const handleRemove = useCallback(() => remove(index), [remove, index]);

    return (
        <Grid templateColumns="subgrid" gridColumn="span 12">
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
            <GridItem>
                <Field.Root>
                    <Input
                        autoComplete="off"
                        type="number"
                        min={0}
                        step={1}
                        size="2xs"
                        {...register(`itineraries.${index}.fuel`, { valueAsNumber: true })}
                    />
                </Field.Root>
            </GridItem>
            <GridItem>
                <Field.Root>
                    <TimeInput name={`itineraries.${index}.hh`} control={control} />
                </Field.Root>
            </GridItem>
            <GridItem>
                <Field.Root>
                    <TimeInput name={`itineraries.${index}.mh`} control={control} />
                </Field.Root>
            </GridItem>
            <GridItem>
                <Field.Root>
                    <TimeInput name={`itineraries.${index}.sh`} control={control} />
                </Field.Root>
            </GridItem>
            <GridItem>
                <Field.Root invalid={!!errors.itineraries?.[index]?.total}>
                    <Controller
                        rules={{
                            validate: (value) => {
                                if (value === null) return true;
                                const totalMinutes = Math.round(value * 60);
                                return (totalMinutes % 6 === 0) || "Не кратне 6 хвилинам";
                            }
                        }}
                        render={({ field: { onChange, value, ...field } }) => {
                            return (
                                <Input
                                    disabled
                                    size="2xs"
                                    variant="subtle"
                                    value={decimalToTimeString(value)}
                                    onChange={(e) => onChange(timeStringToDecimal(e.target.value))}
                                    {...field}
                                />
                            )
                        }}
                        name={`itineraries.${index}.total`}
                        control={control}
                    />
                </Field.Root>
            </GridItem>
            <GridItem alignSelf="center">
                <Text textStyle="sm">{calculations.consumed}</Text>
            </GridItem>
            <GridItem alignSelf="center">
                <Text textStyle="sm">{calculations.remain}</Text>
            </GridItem>
            <GridItem alignSelf="center">
                <Badge colorPalette="purple" size="lg">
                    <Text fontWeight="bold">{decimalToTimeString(calculations.hours)}</Text>
                </Badge>
            </GridItem>
            <GridItem alignSelf="center">
                <Badge colorPalette="purple" size="lg">
                    <Text fontWeight="bold">{decimalToTimeString(calculations.hours)}</Text>
                </Badge>
            </GridItem>
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
                        onClick={handleRemove}
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
}

export default memo<RecordProps>(Record);