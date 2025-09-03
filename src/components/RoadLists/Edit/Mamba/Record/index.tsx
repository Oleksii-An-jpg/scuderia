'use client';
import {FC, useEffect, useMemo, useState} from "react";
import {UseFieldArrayRemove, useFormContext} from "react-hook-form";
import {formatDecimalHours, parseUsage} from "@/components/RoadLists/Edit/Mamba";
import {
    Alert,
    Badge,
    Button,
    Collapsible,
    Field,
    Grid,
    GridItem,
    HStack, IconButton,
    Input,
    Text,
    Textarea
} from "@chakra-ui/react";
import {useHookFormMask} from "use-mask-input";
import {MambaRoadList, MambaUsage} from "@/components/RoadLists";
import {BiChevronDown, BiChevronUp, BiTrash} from "react-icons/bi";
import {useBoolean} from "react-use";

type RecordProps = {
    index: number;
    aggregation: number;
    remove: UseFieldArrayRemove
}

export function getUsage(itinerary: MambaUsage) {
    return Math.round(((itinerary?.hh || 0) * 6.3 + (itinerary?.mh || 0) * 31.2 + (itinerary?.sh || 0) * 137 + (itinerary?.ph || 0) * 253) * 100) / 100;
}

const Record: FC<RecordProps> = ({ index, aggregation, remove }) => {
    const { register, setValue, formState: { errors }, subscribe } = useFormContext<MambaRoadList>();
    const registerWithMask = useHookFormMask(register);
    const [total, setTotal] = useState(0);
    const [usage, setUsage] = useState(0);
    const [spent, setSpent] = useState(0)
    const [remaining, setRemaining] = useState(0);
    useEffect(() => {
        const roundDown2 = (n: number) => Math.floor(n * 100) / 100;

        const unsubscribe = subscribe({
            formState: { values: true },
            callback: ({ values }) => {
                const { spent, remaining, total, usage } =
                    values.itineraries.reduce<{
                        remaining: number;
                        prev: number;        // last remaining carried forward
                        prevUsage: number;   // cumulative time of earlier rows
                        spent: number;
                        total: number;
                        usage: number;
                    }>(
                        (acc, it, i) => {
                            const rowUsage = {
                                hh: parseUsage(Number(it.hh)),
                                mh: parseUsage(Number(it.mh)),
                                sh: parseUsage(Number(it.sh)),
                                ph: parseUsage(Number(it.ph)),
                            };

                            const rowSpent = getUsage(rowUsage); // fuel consumed for this row
                            const rowTotal =
                                rowUsage.hh + rowUsage.mh + rowUsage.sh + rowUsage.ph; // time (hh)

                            const nextRemaining = acc.prev + (it.fuel || 0) - rowSpent;

                            if (i === index) {
                                acc.remaining = roundDown2(nextRemaining);
                                acc.spent = roundDown2(rowSpent);
                                acc.total = rowTotal;
                                acc.usage = acc.prevUsage + rowTotal + aggregation;
                            }

                            // carry forward for the next iteration
                            acc.prev = nextRemaining;          // NOTE: assignment, not +=
                            acc.prevUsage += rowTotal;

                            return acc;
                        },
                        {
                            remaining: 0,
                            spent: 0,
                            total: 0,
                            usage: 0,
                            prev: values.fuel || 0, // initial tank
                            prevUsage: 0,
                        }
                    );

                setSpent(spent);
                setRemaining(remaining);
                setUsage(usage);
                setTotal(total);
            },
        });

        return () => unsubscribe();
    }, [subscribe, index, aggregation]);

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

    const [open, setOpen] = useBoolean(false)

    return (
        <Collapsible.Root asChild onOpenChange={setOpen}>
            <Grid templateColumns="subgrid" gridColumn="span 13" gap={2}>
                {errors.itineraries?.[index]?.total && <GridItem colSpan={6}>
                    <Alert.Root status="error">
                        <Alert.Indicator />
                        <Alert.Title>{errors?.itineraries?.[index]?.total?.message}</Alert.Title>
                    </Alert.Root>
                </GridItem>}
                <Field.Root>
                    <Input variant="subtle" type="date" size="xs" {...register(`itineraries.${index}.date`, {
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
                    <Text textStyle="sm">
                        {spent}
                    </Text>
                </GridItem>
                <GridItem alignSelf="center">
                    <Text textStyle="sm" fontWeight={remaining < 0 ? 'bold' : 'medium'} color={remaining < 0 ? 'red.500' : 'black'}>
                        {remaining}
                    </Text>
                </GridItem>
                <GridItem alignSelf="center">
                    <Badge colorPalette="purple" size="lg">
                        <Text fontWeight="bold">{formatDecimalHours(usage)}</Text>
                    </Badge>
                </GridItem>
                <GridItem alignSelf="center">
                    <Badge colorPalette="purple" size="lg">
                        <Text fontWeight="bold">{formatDecimalHours(usage)}</Text>
                    </Badge>
                </GridItem>
                <GridItem>
                    <HStack>
                        <Collapsible.Trigger asChild>
                            <Button size="xs">
                                {open ? <BiChevronUp /> : <BiChevronDown />} Коментар
                            </Button>
                        </Collapsible.Trigger>
                        <IconButton colorPalette="red" onClick={() => remove(index)} size="xs" aria-label="Видалити">
                            <BiTrash />
                        </IconButton>
                    </HStack>
                </GridItem>
                <GridItem colSpan={13}>
                    <Collapsible.Content>
                        <Field.Root>
                            <Textarea
                                {...register("comment")}
                            />
                        </Field.Root>
                    </Collapsible.Content>
                </GridItem>
            </Grid>
        </Collapsible.Root>
    )
}

export default Record