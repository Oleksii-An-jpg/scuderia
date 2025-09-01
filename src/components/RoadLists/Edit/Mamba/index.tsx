'use client';
import {FC, useEffect, useMemo, useState} from "react";
import {BaseItinerary, RoadList, upsertDoc, Vehicle} from "@/db";
import {FormProvider, useFieldArray, useForm} from "react-hook-form";
import {Button, Field, Grid, GridItem, Heading, HStack, Input, Text, VStack} from "@chakra-ui/react";
import Record, {getUsage} from "@/components/RoadLists/Edit/Mamba/Record";
import {BiPlus, BiSave} from "react-icons/bi";
import {getDoc} from "firebase/firestore";
import {MambaRoadList} from "@/components/RoadLists";

export function parseUsage(value: number | null) {
    return typeof value !== 'number' || isNaN(value) ? 0 : value
}

export function getTotalUsage(doc: MambaRoadList) {
    return doc.itineraries.reduce((acc, it) => {
        acc += it.hh || 0;
        acc += it.mh || 0;
        acc += it.sh || 0;
        acc += it.ph || 0;
        return acc;
    }, 0)
}

export function formatDecimalHours(value: number) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

const parseFSDoc = (doc: MambaRoadList) => {
    return {
        ...doc,
        itineraries: doc.itineraries.map(({ hh, mh, sh, ph, ...rest }) => ({
            ...rest,
            hh: hh ? formatDecimalHours(hh) : null,
            mh: mh ? formatDecimalHours(mh) : null,
            sh: sh ? formatDecimalHours(sh) : null,
            ph: ph ? formatDecimalHours(ph) : null,
        }))
    }
}

const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
}

type MambaProps = {
    docID: string | null;
    docs: MambaRoadList[]
    onUpsert: (data: MambaRoadList, id?: string) => void
}

const DEFAULT: MambaRoadList = {
    start: new Date(),
    end: new Date(),
    vehicle: Vehicle.MAMBA,
    fuel: 0,
    itineraries: [
        {
            date: formatDate(new Date()),
            hh: null,
            mh: null,
            sh: null,
            ph: null,
            br: null,
            total: null,
            fuel: 0,
        }
    ]
}

type MambaFormUsage = {
    hh: string | null;
    mh: string | null;
    sh: string | null;
    ph: string | null;
}

type MambaFormValues = RoadList<BaseItinerary & MambaFormUsage & {
    total: string | null;
}>;

const Mamba: FC<MambaProps> = ({ docs, onUpsert, docID }) => {
    const doc = useMemo(() => {
        return docs.find(d => d.id === docID) || DEFAULT
    }, [docs, docID]);
    const methods = useForm<MambaFormValues>({
        defaultValues: parseFSDoc(doc)
    });
    const { control, handleSubmit, getValues, formState: { isSubmitting }, reset, subscribe, register } = methods
    const [spent, setSpent] = useState<{
        hh: number;
        mh: number;
        sh: number;
        ph: number;
        fullTime: number;
        remaining: number[];
        spent: number;
        usage: number[]
        total: number[]
        consumption: number[];
    }>({
        hh: 0,
        mh: 0,
        sh: 0,
        ph: 0,
        spent: 0,
        remaining: [],
        consumption: [],
        usage: [],
        total: [],
        fullTime: 0
    });
    const aggregation = useMemo(() => {
        const index = docs.findIndex(d => d.id === doc.id);
        const slice = doc.id ? docs.slice(index + 1) : docs;
        return slice.reduce((acc, doc) => {
            acc += getTotalUsage(doc);
            return acc;
        }, 0);

    }, [docs, doc]);

    useEffect(() => {
        reset(parseFSDoc(doc));
    }, [doc]);

    useEffect(() => {
        const callback = subscribe({
            formState: {
                values: true,
            },
            callback: ({ values }) => {
                const { totals, remaining, spent, usage, total, fullTime, consumption } = values.itineraries.reduce<{
                    totals: { hh: number; mh: number; sh: number; ph: number };
                    remaining: number[];
                    usage: number[];
                    total: number[];
                    consumption: number[];
                    spent: number;
                    prev: number;
                    fullTime: number;
                }>(
                    (acc, it) => {
                        const rowUsage = {
                            hh: parseUsage(Number(it.hh)),
                            mh: parseUsage(Number(it.mh)),
                            sh: parseUsage(Number(it.sh)),
                            ph: parseUsage(Number(it.ph)),
                        };

                        const spent = getUsage(rowUsage);

                        const total = rowUsage.hh + rowUsage.mh + rowUsage.sh + rowUsage.ph;
                        acc.totals = {
                            hh: acc.totals.hh + rowUsage.hh,
                            mh: acc.totals.mh + rowUsage.mh,
                            sh: acc.totals.sh + rowUsage.sh,
                            ph: acc.totals.ph + rowUsage.ph,
                        };

                        const remaining = acc.prev + (it.fuel || 0) - spent;

                        acc.remaining.push(Math.floor(remaining * 100) / 100);
                        acc.usage.push(total + aggregation)
                        acc.total.push(total);
                        acc.consumption.push(spent);
                        acc.prev = remaining;
                        acc.spent += spent;
                        acc.fullTime += total;
                        return acc;
                    },
                    {
                        totals: { hh: 0, mh: 0, sh: 0, ph: 0 },
                        remaining: [],
                        usage: [],
                        total: [],
                        consumption: [],
                        spent: 0,
                        prev: values.fuel,
                        fullTime: 0
                    }
                );

                setSpent((prev) => ({
                    ...prev,
                    ...totals
                }))
                // setSpent({
                //     ...totals,
                //     remaining,
                //     spent,
                //     usage,
                //     total,
                //     fullTime,
                //     consumption,
                // });
            },
        })

        return () => callback()
    }, [subscribe]);

    const { fields, append } = useFieldArray({
        control,
        name: "itineraries"
    });

    return <FormProvider {...methods}>
        <form onSubmit={handleSubmit(async (data) => {
            const ref = await upsertDoc({
                ...data,
                vehicle: Vehicle.MAMBA
            }, doc.id);

            const updates = await getDoc(ref);
            if (updates.exists()) {
                onUpsert(updates.data() as unknown as MambaRoadList, updates.id);
            }
        })}>
            <VStack alignItems="stretch">
                {doc ? <Heading size="sm">Дорожній лист від {new Intl.DateTimeFormat('uk-UA', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit'
                }).format(doc.start)} по {new Intl.DateTimeFormat('uk-UA', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit'
                }).format(doc.end)}</Heading> : <Heading size="sm">Новий дорожній лист</Heading>}
                <HStack>
                    <Field.Root>
                        <Field.Root>
                            <Field.Label>
                                <Field.RequiredIndicator />
                                Паливо на початок зміни (л)
                            </Field.Label>
                            <Input autoComplete="off" {...register('fuel', {
                                required: true,
                                valueAsNumber: true,
                            })} />
                            <Field.HelperText />
                            <Field.ErrorText />
                        </Field.Root>
                    </Field.Root>
                    <Field.Root>
                        <Field.Root>
                            <Field.Label>
                                <Field.RequiredIndicator />
                                Напрацювання на початок зміни Л Мотор (год)
                            </Field.Label>
                            {/*<Input {...register('fuel', {*/}
                            {/*    required: true,*/}
                            {/*    valueAsNumber: true,*/}
                            {/*})} />*/}
                            <Field.HelperText />
                            <Field.ErrorText />
                        </Field.Root>
                    </Field.Root>
                    <Field.Root>
                        <Field.Root>
                            <Field.Label>
                                <Field.RequiredIndicator />
                                Напрацювання на початок зміни П Мотор (год)
                            </Field.Label>
                            {/*<Input {...register('fuel', {*/}
                            {/*    required: true,*/}
                            {/*    valueAsNumber: true,*/}
                            {/*})} />*/}
                            <Field.HelperText />
                            <Field.ErrorText />
                        </Field.Root>
                    </Field.Root>
                </HStack>
                <Grid templateColumns="1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr" gap={2} alignItems="end">
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">
                            Дата
                        </Text>
                    </GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">
                            БР
                        </Text>
                    </GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">
                            Бункеровка
                        </Text>
                    </GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">
                            ХХ
                        </Text>
                    </GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">МХ</Text>
                    </GridItem>
                    <GridItem><Text textStyle="sm" fontWeight="bold">СХ</Text></GridItem>
                    <GridItem><Text textStyle="sm" fontWeight="bold">ПХ</Text></GridItem>
                    <GridItem><Text textStyle="sm" fontWeight="bold">Усього</Text></GridItem>
                    <GridItem><Text textStyle="sm" fontWeight="bold">Розхід</Text></GridItem>
                    <GridItem><Text textStyle="sm" fontWeight="bold">Залишок</Text></GridItem>
                    <GridItem><Text textStyle="sm" fontWeight="bold">Л Мотор</Text></GridItem>
                    <GridItem><Text textStyle="sm" fontWeight="bold">П Мотор</Text></GridItem>
                    {fields.map((field, index) => {
                        const remaining = spent.remaining[index] || 0;
                        const total = spent.total[index] || 0;
                        const usage = spent.usage[index] || 0;
                        const consumption = spent.consumption[index] || 0;

                        return <Record key={field.id} remaining={remaining} consumption={consumption} usage={usage} index={index} total={total} aggregation={aggregation} />
                    })}
                    <GridItem colStart={4} px={2}>
                        <Text textStyle="sm" fontWeight="bold">{formatDecimalHours(spent.hh)}</Text>
                    </GridItem>
                    <GridItem px={2}>
                        <Text textStyle="sm" fontWeight="bold">{formatDecimalHours(spent.mh)}</Text>
                    </GridItem>
                    <GridItem px={2}>
                        <Text textStyle="sm" fontWeight="bold">{formatDecimalHours(spent.sh)}</Text>
                    </GridItem>
                    <GridItem px={2}>
                        <Text textStyle="sm" fontWeight="bold">{formatDecimalHours(spent.ph)}</Text>
                    </GridItem>
                    <GridItem px={2}>
                        <Text textStyle="sm" fontWeight="bold">{formatDecimalHours(spent.fullTime)}</Text>
                    </GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">{spent.spent}</Text>
                    </GridItem>
                    <Grid templateColumns="subgrid" gridColumn="span 9" gap={2}>
                        <HStack>
                            <Button size="xs" colorPalette="green" onClick={() => {
                                const itineraries = getValues('itineraries');
                                const last = itineraries[itineraries.length - 1];
                                const date = new Date(last.date);
                                date.setDate(date.getDate() + 1);
                                append({
                                    hh: null,
                                    mh: null,
                                    sh: null,
                                    ph: null,
                                    total: null,
                                    br: null,
                                    fuel: 0,
                                    date: formatDate(date),
                                });
                            }}>Додати запис <BiPlus /></Button>
                            <Button colorPalette="blue" size="xs" loading={isSubmitting} type="submit">Зберегти <BiSave /></Button>
                        </HStack>
                    </Grid>
                </Grid>
            </VStack>
        </form>
    </FormProvider>
}

export default Mamba;