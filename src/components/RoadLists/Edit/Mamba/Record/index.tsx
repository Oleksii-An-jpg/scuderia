'use client';
import {FC, useEffect, useMemo, useState} from "react";
import {useFormContext} from "react-hook-form";
import {formatDecimalHours} from "@/components/RoadLists/Edit/Mamba";
import {Alert, Field, Grid, GridItem, Input, Text} from "@chakra-ui/react";
import {useHookFormMask} from "use-mask-input";
import {MambaRoadList, MambaUsage} from "@/components/RoadLists";

type RecordProps = {
    index: number;
    remaining: number;
    aggregation: number
    total: number
    usage: number
    consumption: number
}

export function getUsage(itinerary: MambaUsage) {
    return Math.round(((itinerary?.hh || 0) * 6.3 + (itinerary?.mh || 0) * 31.2 + (itinerary?.sh || 0) * 137 + (itinerary?.ph || 0) * 253) * 100) / 100;
}

const Record: FC<RecordProps> = ({ index, remaining, total, usage, consumption }) => {
    const { register, setValue, formState: { errors } } = useFormContext<MambaRoadList>();
    const registerWithMask = useHookFormMask(register);
    console.log('render');
    useEffect(() => {
        setValue(`itineraries.${index}.total`, formatDecimalHours(total), { shouldValidate: true })
    }, [total, index, setValue]);
    const timeOptions = useMemo(() => ({
        inputFormat: 'HH:MM',
        showMaskOnFocus: false,
        placeholder: '__:__',
        setValueAs: (value: string) => {
            if (value) {
                const [hours, minutes] = value.split(":").map(Number);
                if (!isNaN(hours) && !isNaN(minutes)) {
                    return hours + (minutes / 60);
                }
            }
            return null;
        }
    }), []);

    return (
        <Grid templateColumns="subgrid" gridColumn="span 12" gap={2}>
            {errors.itineraries?.[index]?.total && <GridItem colSpan={6}>
                <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Title>{errors?.itineraries?.[index]?.total?.message}</Alert.Title>
                </Alert.Root>
            </GridItem>}
            <Field.Root>
                <Input type="date" size="xs" {...register(`itineraries.${index}.date`, {
                    required: true,
                })} />
            </Field.Root>
            <Field.Root>
                <Input autoComplete="off" type="number" size="xs" {...register(`itineraries.${index}.br`, {
                    valueAsNumber: true
                })} />
            </Field.Root>
            <Field.Root>
                <Input autoComplete="off" min={0} type="number" size="xs" {...register(`itineraries.${index}.fuel`, {
                    valueAsNumber: true
                })} />
            </Field.Root>
            <Field.Root>
                <Input autoComplete="off" size="xs" {...registerWithMask(`itineraries.${index}.hh`, 'datetime', timeOptions)} />
                <Field.ErrorText />
            </Field.Root>
            <Field.Root>
                <Input autoComplete="off" size="xs" {...registerWithMask(`itineraries.${index}.mh`, 'datetime', timeOptions)} />
            </Field.Root>
            <Field.Root>
                <Input autoComplete="off" size="xs" {...registerWithMask(`itineraries.${index}.sh`, 'datetime', timeOptions)} />
            </Field.Root>
            <Field.Root>
                <Input autoComplete="off" size="xs" {...registerWithMask(`itineraries.${index}.ph`, 'datetime', timeOptions)} />
            </Field.Root>

            <Field.Root invalid={!!errors.itineraries?.[index]?.total}>
                <Input variant="subtle" disabled autoComplete="off" size="xs" {...registerWithMask(`itineraries.${index}.total`, '99:99', {
                    validate: (value: string) => {
                        const [hours, minutes] = value.split(":").map(Number);

                        if (isNaN(hours) || isNaN(minutes)) return true;

                        return minutes % 6 === 0 || "Сумарний час має бути в 6-хвилинному інтервалі (04:24, 11:00, 11:06, 11:12, і тд.)";
                    }
                })} />
            </Field.Root>
            <GridItem alignSelf="center">
                <Text textStyle="sm" fontWeight="bold">
                    {consumption}
                </Text>
            </GridItem>
            <GridItem alignSelf="center">
                <Text textStyle="sm" fontWeight="bold">
                    {remaining}
                </Text>
            </GridItem>
            <GridItem alignSelf="center">
                <Text textStyle="sm" fontWeight="bold">
                    {formatDecimalHours(usage)}
                </Text>
            </GridItem>
            <GridItem alignSelf="center">
                <Text textStyle="sm" fontWeight="bold">
                    {formatDecimalHours(usage)}
                </Text>
            </GridItem>
        </Grid>
    )
}

export default Record