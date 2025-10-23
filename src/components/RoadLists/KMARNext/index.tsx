'use client';
import {FC, memo, useCallback, useEffect, useState} from "react";
import {KMARRoadListAppModel, KMARRoadListUIModel} from "@/models/mamba";
import {Controller, FormProvider, useFieldArray, useForm, useWatch} from "react-hook-form";
import {calculateCumulative} from "@/calculator";
import {Button, Field, Grid, GridItem, Heading, HStack, Input, Separator, Text, VStack} from "@chakra-ui/react";
import Summary from "@/components/RoadLists/KMARNext/Summary";
import {BiPlus} from "react-icons/bi";
import Record from "@/components/RoadLists/KMARNext/Record";
import {upsertDoc} from "@/db";
import DatePicker from "react-datepicker";

type KMARNextProps = {
    model: KMARRoadListAppModel
    onBeforeSubmit: () => void;
    onAfterSubmit: () => void;
}

const KMARNext: FC<KMARNextProps> = ({ model, onBeforeSubmit, onAfterSubmit }) => {
    const methods = useForm<KMARRoadListAppModel>({
        defaultValues: model,
    });
    const { control, reset, register, handleSubmit } = methods;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "itineraries"
    });

    const [itineraries, startHours, startFuel] = useWatch({
        control,
        name: ["itineraries", "startHours", "startFuel"],
    });

    const [cumulative, setCumulative] = useState<KMARRoadListUIModel>(() => {
        return calculateCumulative({
            ...model,
            itineraries, startHours, startFuel
        }) as KMARRoadListUIModel;
    })

    useEffect(() => {
        const timer = setTimeout(() => {
            const uiModel = calculateCumulative({
                ...model,
                itineraries, startHours, startFuel,
            }) as KMARRoadListUIModel;
            setCumulative(uiModel)
        }, 100);

        return () => clearTimeout(timer);
    }, [itineraries, startHours, startFuel]);

    useEffect(() => {
        reset(model);
    }, [model, reset]);

    const handleFormSubmit = useCallback(async (data: KMARRoadListAppModel) => {
        onBeforeSubmit();

        const dates = data.itineraries.map(item => item.date.getTime());

        const minDate = data.start || new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        await upsertDoc({
            ...data,
            start: minDate,
            end: maxDate
        }, model.id);

        onAfterSubmit();
    }, []);

    const handleAppend = useCallback(() => {
        append({
            date: new Date(),
            br: null,
            fuel: null,
            hh: null,
            mh: null,
            sh: null,
        });
    }, [append]);

    return <FormProvider {...methods}>
        <form id="upsert" onSubmit={handleSubmit(handleFormSubmit)}>
            <VStack alignItems="stretch" gap={4}>
                <VStack alignItems="stretch" gap={2}>
                    <Heading size="md">На початок зміни</Heading>
                    <HStack>
                        <Field.Root w="auto">
                            <Field.Label>Паливо (л)</Field.Label>
                            <Input
                                size="xs"
                                autoComplete="off"
                                type="number"
                                step="1"
                                {...register("startFuel", { valueAsNumber: true })}
                            />
                        </Field.Root>
                        <Field.Root w="auto">
                            <Field.Label>Напрацювання (год.дес)</Field.Label>
                            <Input step={0.01} autoComplete="off" size="xs" {...register('startHours', {
                                valueAsNumber: true
                            })} />
                        </Field.Root>
                        <Field.Root w="auto">
                            <Field.Label>Дорожній лист</Field.Label>
                            <Input size="xs" autoComplete="off" {...register("roadListID")} />
                        </Field.Root>
                        <Field.Root w="auto">
                            <Field.Label>Дата початку</Field.Label>
                            <Controller
                                name={`start`}
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
                    </HStack>
                </VStack>

                <HStack>
                    <Separator flex="1" />
                    <Text flexShrink="0" textStyle="md" fontWeight="bold">Записи</Text>
                    <Separator flex="1" />
                </HStack>

                <Grid templateColumns="repeat(3, 6em) repeat(4, 5.5em) repeat(4, 5em) auto" gap={2}>
                    <Grid templateColumns="subgrid" gridColumn="span 12">
                        <GridItem><Heading size="sm">Дата</Heading></GridItem>
                        <GridItem><Heading size="sm">БР</Heading></GridItem>
                        <GridItem><Heading size="sm">Бункеровка</Heading></GridItem>
                        <GridItem><Heading size="sm">ХХ</Heading></GridItem>
                        <GridItem><Heading size="sm">МХ</Heading></GridItem>
                        <GridItem><Heading size="sm">СХ</Heading></GridItem>
                        <GridItem><Heading size="sm">Усього</Heading></GridItem>
                        <GridItem><Heading size="sm">Розхід</Heading></GridItem>
                        <GridItem><Heading size="sm">Залишок</Heading></GridItem>
                        <GridItem><Heading size="sm">Л Мотор</Heading></GridItem>
                        <GridItem><Heading size="sm">П Мотор</Heading></GridItem>
                        <GridItem><Heading size="sm">Коментар</Heading></GridItem>
                    </Grid>

                    {fields.map((field, index) => {
                        return (
                            <Record key={field.id} index={index} onRemove={() => remove(index)} {...cumulative.itineraries[index]} />
                        )
                    })}

                    <Summary {...cumulative} />
                </Grid>

                <HStack>
                    <Button colorPalette="blue" size="xs" onClick={handleAppend}>
                        <BiPlus /> Додати запис
                    </Button>
                </HStack>
            </VStack>
        </form>
    </FormProvider>
}

export default memo(KMARNext)