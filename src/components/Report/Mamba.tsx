import {FC, Fragment, useEffect, useMemo, useCallback} from "react";
import {Field, GridItem, Heading, HStack, NativeSelect, Text} from "@chakra-ui/react";
import {useFormContext} from "react-hook-form";
import {convertToDecimalHours, formatMinutes} from "@/components/Report/Create";
import {Record, RoadList} from "@/db";

type Time = {
    hours: number
    minutes: number
}

type Mamba = {
    idle?: Time;
    low?: Time;
    medium?: Time;
    full?: Time;
    fueling?: number;
    remaining?: number;
}

type MambaProps = {
    index: number;
    hours: number[];
    minutes: number[];
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
        acc.idle += (record.idle?.hours ?? 0) * 60 + (record.idle?.minutes ?? 0);
        acc.low += (record.low?.hours ?? 0) * 60 + (record.low?.minutes ?? 0);
        acc.medium += (record.medium?.hours ?? 0) * 60 + (record.medium?.minutes ?? 0);
        acc.full += (record.full?.hours ?? 0) * 60 + (record.full?.minutes ?? 0);
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
        {options.idle && <GridItem colStart={5}>
            <Heading size="sm">{formatMinutes(idle)}</Heading>
            <Heading size="sm">{consumption.idle} л.</Heading>
        </GridItem>}

        {options.low && <GridItem>
            <Heading size="sm">{formatMinutes(low)}</Heading>
            <Heading size="sm">{consumption.low} л.</Heading>
        </GridItem>}
        {options.medium && <GridItem>
            <Heading size="sm">{formatMinutes(medium)}</Heading>
            <Heading size="sm">{consumption.medium} л.</Heading>
        </GridItem>}
        {options.full && <GridItem>
            <Heading size="sm">{formatMinutes(full)}</Heading>
            <Heading size="sm">{consumption.full} л.</Heading>
        </GridItem>}
        <GridItem>
            <Heading size="sm">{formatMinutes(consumption.time)}</Heading>
        </GridItem>
        <GridItem>
            <Heading size="sm">{consumption.total} л.</Heading>
        </GridItem>
    </>
}

export const Mamba: FC<MambaProps> = ({ index, hours, minutes }) => {
    const { register, watch, setValue } = useFormContext<RoadList<Mamba>>();

    // Watch only the specific record and previous record to minimize re-renders
    const currentRecord = watch(`records.${index}`);
    const previousRecord = watch(`records.${index - 1}`);

    // Memoize hour and minute options to prevent recreation
    const hourOptions = useMemo(() =>
        hours.map((hour) => (
            <option key={hour} value={hour}>
                {`${hour} год.`}
            </option>
        )), [hours]);

    const minuteOptions = useMemo(() =>
        minutes.map((minute) => (
            <option key={minute} value={minute}>
                {`${minute} хв.`}
            </option>
        )), [minutes]);

    // Memoize time calculations with proper dependencies for object mutations
    const timeCalculations = useMemo(() => {
        const idle = (currentRecord?.idle?.hours ?? 0) * 60 + (currentRecord?.idle?.minutes ?? 0);
        const low = (currentRecord?.low?.hours ?? 0) * 60 + (currentRecord?.low?.minutes ?? 0);
        const medium = (currentRecord?.medium?.hours ?? 0) * 60 + (currentRecord?.medium?.minutes ?? 0);
        const full = (currentRecord?.full?.hours ?? 0) * 60 + (currentRecord?.full?.minutes ?? 0);

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
        currentRecord?.idle?.hours,
        currentRecord?.idle?.minutes,
        currentRecord?.low?.hours,
        currentRecord?.low?.minutes,
        currentRecord?.medium?.hours,
        currentRecord?.medium?.minutes,
        currentRecord?.full?.hours,
        currentRecord?.full?.minutes
    ]);

    // Memoize decimal calculations with proper dependencies
    const decimalTimes = useMemo(() => ({
        idle: convertToDecimalHours(currentRecord?.idle?.hours ?? 0, currentRecord?.idle?.minutes ?? 0),
        low: convertToDecimalHours(currentRecord?.low?.hours ?? 0, currentRecord?.low?.minutes ?? 0),
        medium: convertToDecimalHours(currentRecord?.medium?.hours ?? 0, currentRecord?.medium?.minutes ?? 0),
        full: convertToDecimalHours(currentRecord?.full?.hours ?? 0, currentRecord?.full?.minutes ?? 0)
    }), [
        currentRecord?.idle?.hours,
        currentRecord?.idle?.minutes,
        currentRecord?.low?.hours,
        currentRecord?.low?.minutes,
        currentRecord?.medium?.hours,
        currentRecord?.medium?.minutes,
        currentRecord?.full?.hours,
        currentRecord?.full?.minutes
    ]);

    // Memoize consumption calculation
    const consumption = useMemo(() => Math.ceil((decimalTimes.idle * CONSUMPTION_RATES.idle +
        decimalTimes.low * CONSUMPTION_RATES.low +
        decimalTimes.medium * CONSUMPTION_RATES.medium +
        decimalTimes.full * CONSUMPTION_RATES.full) * 100) / 100, [decimalTimes]);

    // Memoize remaining calculation
    const remaining = useMemo(() =>
            Math.ceil(((currentRecord?.fueling || 0) - consumption + (previousRecord?.remaining || 0)) * 100) / 100,
        [currentRecord?.fueling, consumption, previousRecord?.remaining]
    );

    // Use useCallback for setValue to prevent unnecessary re-renders
    const updateRemaining = useCallback(() => {
        setValue(`records.${index}.remaining`, remaining);
    }, [setValue, index, remaining]);

    useEffect(() => {
        updateRemaining();
    }, [updateRemaining]);

    // Memoize register calls
    const registerIdle = useMemo(() => ({
        hours: register(`records.${index}.idle.hours`, { valueAsNumber: true }),
        minutes: register(`records.${index}.idle.minutes`, { valueAsNumber: true })
    }), [register, index]);

    const registerLow = useMemo(() => ({
        hours: register(`records.${index}.low.hours`, { valueAsNumber: true }),
        minutes: register(`records.${index}.low.minutes`, { valueAsNumber: true })
    }), [register, index]);

    const registerMedium = useMemo(() => ({
        hours: register(`records.${index}.medium.hours`, { valueAsNumber: true }),
        minutes: register(`records.${index}.medium.minutes`, { valueAsNumber: true })
    }), [register, index]);

    const registerFull = useMemo(() => ({
        hours: register(`records.${index}.full.hours`, { valueAsNumber: true }),
        minutes: register(`records.${index}.full.minutes`, { valueAsNumber: true })
    }), [register, index]);

    return (
        <Fragment>
            <Field.Root>
                <HStack w="100%">
                    <NativeSelect.Root size="xs">
                        <NativeSelect.Field {...registerIdle.hours}>
                            {hourOptions}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <NativeSelect.Root size="xs">
                        <NativeSelect.Field {...registerIdle.minutes}>
                            {minuteOptions}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </HStack>
                <Field.ErrorText />
            </Field.Root>

            <Field.Root>
                <HStack w="100%">
                    <NativeSelect.Root size="xs">
                        <NativeSelect.Field {...registerLow.hours}>
                            {hourOptions}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <NativeSelect.Root size="xs">
                        <NativeSelect.Field {...registerLow.minutes}>
                            {minuteOptions}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </HStack>
                <Field.ErrorText />
            </Field.Root>

            <Field.Root>
                <HStack w="100%">
                    <NativeSelect.Root size="xs">
                        <NativeSelect.Field {...registerMedium.hours}>
                            {hourOptions}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <NativeSelect.Root size="xs">
                        <NativeSelect.Field {...registerMedium.minutes}>
                            {minuteOptions}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </HStack>
                <Field.ErrorText />
            </Field.Root>

            <Field.Root>
                <HStack w="100%">
                    <NativeSelect.Root size="xs">
                        <NativeSelect.Field {...registerFull.hours}>
                            {hourOptions}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <NativeSelect.Root size="xs">
                        <NativeSelect.Field {...registerFull.minutes}>
                            {minuteOptions}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </HStack>
                <Field.ErrorText />
            </Field.Root>

            <GridItem alignSelf="center">
                <Text fontWeight="bold" whiteSpace="nowrap">
                    {`${timeCalculations.total.hours} год. ${timeCalculations.total.minutes} хв.`}
                </Text>
            </GridItem>

            <GridItem alignSelf="center">
                <Text fontWeight="bold" whiteSpace="nowrap">
                    {consumption} л.
                </Text>
            </GridItem>

            <GridItem alignSelf="center">
                <Text fontWeight="bold" whiteSpace="nowrap">
                    {remaining} л.
                </Text>
            </GridItem>
        </Fragment>
    );
};