import {FC, Fragment, useEffect, useMemo, useCallback} from "react";
import {Box, Field, GridItem, Heading, Input, Text, VStack} from "@chakra-ui/react";
import {useFormContext} from "react-hook-form";
import {convertToDecimalHours, formatMinutes} from "@/components/Report/Create";
import {getTime, Time} from "@/components/Time";
import {Record, RoadList} from "@/db";

type Mamba = {
    idle?: string;
    low?: string;
    medium?: string;
    full?: string;
    fueling?: number;
    remaining?: number;
    total?: string;
}

type MambaProps = {
    index: number;
    records: Record<Mamba>[];
}

// Consumption rates as constants
const CONSUMPTION_RATES = {
    idle: 6.3,
    low: 31.2,
    medium: 137,
    full: 253
};

type ReportProps = {
    records: Record<Mamba>[];
    options?: {
        idle: boolean;
        low: boolean;
        medium: boolean;
        full: boolean;
    }
};

export const Report: FC<ReportProps> = ({ records, options = {
    idle: true,
    low: true,
    medium: true,
    full: true,
} }) => {
    const { idle, low, medium, full } = records.reduce((acc, record) => {
        const idle = parseTime(record.idle)
        const low = parseTime(record.low)
        const medium = parseTime(record.medium)
        const full = parseTime(record.full)
        acc.idle += (idle?.hours ?? 0) * 60 + (idle?.minutes ?? 0);
        acc.low += (low?.hours ?? 0) * 60 + (low?.minutes ?? 0);
        acc.medium += (medium?.hours ?? 0) * 60 + (medium?.minutes ?? 0);
        acc.full += (full?.hours ?? 0) * 60 + (full?.minutes ?? 0);
        return acc;
    }, {
        idle: 0,
        low: 0,
        medium: 0,
        full: 0,
    });
    const consumption = useMemo(() => {
        const a = convertToDecimalHours(0, idle) * CONSUMPTION_RATES.idle;
        const b = convertToDecimalHours(0, low) * CONSUMPTION_RATES.low;
        const c = convertToDecimalHours(0, medium) * CONSUMPTION_RATES.medium;
        const d = convertToDecimalHours(0, full) * CONSUMPTION_RATES.full;
        return {
            idle: Math.ceil(a * 100) / 100,
            low: Math.ceil(b * 100) / 100,
            medium: Math.ceil(c * 100) / 100,
            full: Math.ceil(d * 100) / 100,
            total: Math.ceil((a + b + c + d) * 100) / 100,
            time: idle + low + medium + full
        }
    }, [idle, low, medium, full]);
    return <>
        {options.idle && <GridItem gridColumn={4} alignItems="center">
            <Heading size="sm">{formatMinutes(idle)}</Heading>
            <Heading size="sm" whiteSpace="nowrap">{consumption.idle} л.</Heading>
        </GridItem>}

        {options.low && <GridItem>
            <Heading size="sm">{formatMinutes(low)}</Heading>
            <Heading size="sm" whiteSpace="nowrap">{consumption.low} л.</Heading>
        </GridItem>}
        {options.medium && <GridItem>
            <Heading size="sm">{formatMinutes(medium)}</Heading>
            <Heading size="sm" whiteSpace="nowrap">{consumption.medium} л.</Heading>
        </GridItem>}
        {options.full && <Box>
            <Heading size="sm">{formatMinutes(full)}</Heading>
            <Heading size="sm" whiteSpace="nowrap">{consumption.full} л.</Heading>
        </Box>}
        <Box>
            <Heading size="sm">{formatMinutes(consumption.time)}</Heading>
        </Box>
        <Box>
            <Heading textAlign="center" size="sm" whiteSpace="nowrap">{consumption.total}</Heading>
        </Box>
    </>
}



const parseTime = (time?: string) => {
    if (!time) return { hours: 0, minutes: 0 };
    const [hours, minutes] = getTime(time);
    if (isNaN(hours) || isNaN(minutes)) {
        return { hours: 0, minutes: 0 };
    }
    return { hours, minutes };
}

const getTotalMinutes = (time?: string) => {
    if (!time) return 0;
    const { hours, minutes } = parseTime(time);
    return hours * 60 + minutes;
}

export const Mamba: FC<MambaProps> = ({ index, records }) => {
    const { setValue, control, register, formState: { errors } } = useFormContext<RoadList<Mamba>>();

    const currentRecord = records[index];
    const previousRecord = records[index - 1];

    // Memoize time calculations with proper dependencies for object mutations
    const timeCalculations = useMemo(() => {
        const idle = getTotalMinutes(currentRecord.idle);
        const low = getTotalMinutes(currentRecord.low);
        const medium = getTotalMinutes(currentRecord.medium);
        const full = getTotalMinutes(currentRecord.full);

        const totalMinutes = idle + low + medium + full;
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        return {
            idle,
            low,
            medium,
            full,
            total: {
                hours: totalHours,
                minutes: remainingMinutes
            }
        };
    }, [
        currentRecord?.idle,
        currentRecord?.low,
        currentRecord?.medium,
        currentRecord?.full
    ]);

    useEffect(() => {
        setValue(`records.${index}.total`, `${timeCalculations.total.hours}:${timeCalculations.total.minutes < 10 ? `0${timeCalculations.total.minutes}` : timeCalculations.total.minutes}`, {
            shouldValidate: true
        });
    }, [timeCalculations]);

    // Memoize decimal calculations with proper dependencies
    const decimalTimes = useMemo(() => {
        const idle = parseTime(currentRecord.idle);
        const low = parseTime(currentRecord.low);
        const medium = parseTime(currentRecord.medium);
        const full = parseTime(currentRecord.full);
        return {
            idle: convertToDecimalHours(idle.hours, idle.minutes),
            low: convertToDecimalHours(low.hours, low.minutes),
            medium: convertToDecimalHours(medium.hours, medium.minutes),
            full: convertToDecimalHours(full.hours, full.minutes)
        }
    }, [
        currentRecord?.idle,
        currentRecord?.low,
        currentRecord?.medium,
        currentRecord?.full
    ]);

    // Memoize consumption calculation
    const consumption = useMemo(() => {
        const raw = decimalTimes.idle * CONSUMPTION_RATES.idle +
            decimalTimes.low * CONSUMPTION_RATES.low +
            decimalTimes.medium * CONSUMPTION_RATES.medium +
            decimalTimes.full * CONSUMPTION_RATES.full;

        return Math.ceil(Math.round(raw * 100)) / 100;
    }, [decimalTimes]);

    const remaining = useMemo(() => {
        const raw = (currentRecord?.fueling || 0) - consumption + (previousRecord?.remaining || 0);

        return Math.ceil(Math.round(raw * 100)) / 100;
    }, [currentRecord?.fueling, consumption, previousRecord?.remaining]);

    // Use useCallback for setValue to prevent unnecessary re-renders
    const updateRemaining = useCallback(() => {
        setValue(`records.${index}.remaining`, remaining);
    }, [setValue, index, remaining]);

    useEffect(() => {
        updateRemaining();
    }, [updateRemaining]);

    return (
        <Fragment>
            <Time name={`records.${index}.idle`} control={control} label={index === 0 ? `ХХ` : null} />
            <Time name={`records.${index}.low`} control={control} label={index === 0 ? `МХ` : null} />
            <Time name={`records.${index}.medium`} control={control} label={index === 0 ?`СХ` : null} />
            <Time name={`records.${index}.full`} control={control} label={index === 0 ? `ПХ` : null} />

            <VStack gap={1.5}>
                <Field.Root invalid={!!errors?.records?.[index]?.total}>
                    {index === 0 && <Field.Label>Час</Field.Label>}
                    <Field.ErrorText>{errors?.records?.[index]?.total?.message}</Field.ErrorText>
                    <Input disabled variant="subtle" size="xs" {...register(`records.${index}.total`, {
                        validate: (value) => {
                            if (value) {
                                const [hours, minutes] = getTime(value);

                                const totalMinutes = hours * 60 + minutes;
                                return totalMinutes % 6 === 0;
                            }

                            return true
                        }
                    })} />
                </Field.Root>
            </VStack>

            <VStack>
                {index === 0 && <Text textStyle="sm" whiteSpace="nowrap">Розхід (л)</Text>}
                <Text whiteSpace="nowrap" lineHeight="2">
                    {consumption}
                </Text>
            </VStack>

            <VStack>
                {index === 0 && <Text textStyle="sm" whiteSpace="nowrap">Залишок (л)</Text>}
                <Text whiteSpace="nowrap" lineHeight="2">
                    {remaining}
                </Text>
            </VStack>
        </Fragment>
    );
};