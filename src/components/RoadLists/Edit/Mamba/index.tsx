'use client';
import {FC, useEffect, useMemo, useState} from "react";
import {BaseItinerary, RoadList, upsertDoc, Vehicle} from "@/db";
import {FormProvider, useFieldArray, useForm} from "react-hook-form";
import {Button, Field, Grid, GridItem, Heading, HStack, Input, Separator, Text, VStack} from "@chakra-ui/react";
import Record, {getUsage} from "@/components/RoadLists/Edit/Mamba/Record";
import {BiPlus, BiSave, BiSolidFilePdf} from "react-icons/bi";
import {getDoc} from "firebase/firestore";
import {MambaRoadList} from "@/components/RoadLists";

export function parseUsage(value: number | null) {
    return typeof value !== 'number' || isNaN(value) ? 0 : value
}

export function getTotalFueling(doc: MambaRoadList) {
    return doc.itineraries.reduce((acc, it) => {
        const usage = getUsage(it);
        acc = acc + (it.fuel || 0) - usage;
        return acc;
    }, doc.fuel || 0)
}

export function getTotalUsage(doc: MambaRoadList) {
    return doc.itineraries.reduce((acc, it) => {
        acc.time += it.hh || 0;
        acc.time += it.mh || 0;
        acc.time += it.sh || 0;
        acc.time += it.ph || 0;
        acc.fuel += getUsage(it);
        return acc;
    }, {
        time: 0,
        fuel: 0
    })
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
            fuel: null,
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
}> & {
    left?: string | null;
    right?: string | null;
};

const Mamba: FC<MambaProps> = ({ docs, onUpsert, docID }) => {
    const doc = useMemo(() => {
        return docs.find(d => d.id === docID) || DEFAULT
    }, [docs, docID]);
    const {aggregation, fueling} = useMemo(() => {
        const index = docs.findIndex(d => d.id === doc.id);
        const slice = doc.id ? docs.slice(index + 1) : docs;
        const fueling = slice.reduce((acc, doc) => {
            acc += getTotalFueling(doc);
            return acc;
        }, 0);
        const aggregation = slice.reduce((acc, doc) => {
            acc += getTotalUsage(doc).time;
            return acc;
        }, 0);

        return {
            aggregation,
            fueling
        }

    }, [docs, doc]);
    const methods = useForm<MambaFormValues>({
        defaultValues: {
            ...parseFSDoc(doc),
            ...(!docID && {
                fuel: Math.floor(fueling * 100) / 100,
            }),
            left: formatDecimalHours(aggregation),
            right: formatDecimalHours(aggregation),
        }
    });
    const { control, handleSubmit, getValues, formState: { isSubmitting, isValid }, reset, subscribe, register } = methods
    const [hh, setHH] = useState(0);
    const [mh, setMH] = useState(0);
    const [sh, setSH] = useState(0);
    const [ph, setPH] = useState(0);
    const [spent, setSpent] = useState(0);
    const [fullTime, setFullTime] = useState(0);

    useEffect(() => {
        reset({
            ...parseFSDoc(doc),
            ...(!docID && {
                fuel: Math.floor(fueling * 100) / 100,
            }),
            left: formatDecimalHours(aggregation),
            right: formatDecimalHours(aggregation),
        });
    }, [doc]);

    useEffect(() => {
        const callback = subscribe({
            formState: {
                values: true,
            },
            callback: ({ values }) => {
                const { totals, spent, fullTime } = values.itineraries.reduce<{
                    totals: { hh: number; mh: number; sh: number; ph: number };
                    spent: number;
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
                        acc.spent += spent;
                        acc.fullTime += total;
                        return acc;
                    },
                    {
                        totals: { hh: 0, mh: 0, sh: 0, ph: 0 },
                        spent: 0,
                        fullTime: 0,
                    }
                );

                setHH(totals.hh);
                setMH(totals.mh);
                setSH(totals.sh);
                setPH(totals.ph);
                setSpent(Math.floor(spent * 100) / 100);
                setFullTime(fullTime);
            },
        })

        return () => callback()
    }, [subscribe]);

    const { fields, append, remove } = useFieldArray({
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
            <VStack alignItems="stretch" gap={4}>
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
                                Паливо на початок зміни (л)
                            </Field.Label>
                            <Input size="xs" autoComplete="off" {...register('fuel', {
                                valueAsNumber: true,
                            })} />
                        </Field.Root>
                    </Field.Root>
                    <Field.Root>
                        <Field.Root>
                            <Field.Label>
                                Напрацювання на початок зміни Л Мотор (год)
                            </Field.Label>
                            <Input disabled autoComplete="off" size="xs" {...register("left")} />
                        </Field.Root>
                    </Field.Root>
                    <Field.Root>
                        <Field.Root>
                            <Field.Label>
                                Напрацювання на початок зміни П Мотор (год)
                            </Field.Label>
                            <Input disabled autoComplete="off" size="xs" {...register("right")} />
                        </Field.Root>
                    </Field.Root>
                </HStack>
                <HStack>
                    <Separator flex="1" />
                    <Text flexShrink="0" textStyle="md" fontWeight="bold">Записи</Text>
                    <Separator flex="1" />
                </HStack>
                <Grid templateColumns="7em max-content max-content repeat(5,4em) repeat(2,auto) repeat(3,max-content)" rowGap={2} columnGap={4} alignItems="end">
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
                    <GridItem><Text textStyle="sm" fontWeight="bold">Дії</Text></GridItem>
                    {fields.map((field, index) => <Record key={field.id} remove={remove} aggregation={aggregation} index={index} />)}
                    <GridItem colStart={3}><Text textStyle="sm" fontWeight="bold">Разом:</Text></GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">{formatDecimalHours(hh)}</Text>
                    </GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">{formatDecimalHours(mh)}</Text>
                    </GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">{formatDecimalHours(sh)}</Text>
                    </GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">{formatDecimalHours(ph)}</Text>
                    </GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">{formatDecimalHours(fullTime)}</Text>
                    </GridItem>
                    <GridItem>
                        <Text textStyle="sm" fontWeight="bold">{spent}</Text>
                    </GridItem>
                    <Grid templateColumns="subgrid" gridColumn="span 13" gap={2}>
                        <HStack>
                            <Button size="xs" colorPalette="blue" onClick={() => {
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
                                    fuel: null,
                                    date: formatDate(date),
                                });
                            }}><BiPlus /> Додати запис</Button>
                            <Button size="xs" disabled={!isValid} loading={isSubmitting} type="submit"><BiSave /> Зберегти</Button>
                            <Button size="xs" disabled><BiSolidFilePdf /> Експортувати</Button>
                        </HStack>
                    </Grid>
                </Grid>
            </VStack>
        </form>
    </FormProvider>
}

export default Mamba;