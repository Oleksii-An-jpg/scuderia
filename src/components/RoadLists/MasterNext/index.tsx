'use client';
import {FC, memo, useCallback, useEffect, useState} from "react";
import {MasterRoadListAppModel, MasterRoadListUIModel} from "@/models/mamba";
import {Controller, FormProvider, useFieldArray, useForm, useWatch} from "react-hook-form";
import {calculateCumulative} from "@/calculator";
import {Button, Field, Grid, GridItem, Heading, HStack, Input, Separator, Text, VStack} from "@chakra-ui/react";
import Summary from "@/components/RoadLists/MasterNext/Summary";
import {BiPlus} from "react-icons/bi";
import Record from "@/components/RoadLists/MasterNext/Record";
import {upsertDoc} from "@/db";
import DatePicker from "react-datepicker";

type MasterNextProps = {
    model: MasterRoadListAppModel
    onBeforeSubmit: () => void;
    onAfterSubmit: () => void;
}

const MasterNext: FC<MasterNextProps> = ({ model, onBeforeSubmit, onAfterSubmit }) => {
    const methods = useForm<MasterRoadListAppModel>({
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

    const [cumulative, setCumulative] = useState<MasterRoadListUIModel>(() => {
        return calculateCumulative({
            ...model,
            itineraries, startHours, startFuel
        }) as MasterRoadListUIModel;
    })

    useEffect(() => {
        const timer = setTimeout(() => {
            setCumulative(calculateCumulative({
                ...model,
                itineraries, startHours, startFuel,
            }) as MasterRoadListUIModel)
        }, 100);

        return () => clearTimeout(timer);
    }, [itineraries, startHours, startFuel]);

    useEffect(() => {
        reset(model);
    }, [model, reset]);

    const handleFormSubmit = useCallback(async (data: MasterRoadListAppModel) => {
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
        let date = itineraries.length && itineraries[itineraries.length - 1].date;
        if (date) {
            date.setDate(date.getDate() + 1);
        } else {
            date = new Date();
        }
        append({
            date,
            br: null,
            fuel: null,
            t: null,
            '5%': null,
            '10%': null,
            '15%': null,
            '4x4': null,
        });
    }, [append, itineraries]);

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
                            <Field.Label>Одометр</Field.Label>
                            <Input step={0.01} autoComplete="off" size="xs" {...register('startHours', {
                                valueAsNumber: true,
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

                <Grid templateColumns="repeat(3, 6em) repeat(5, 5.5em) repeat(4, 5em) auto" gap={2}>
                    <Grid templateColumns="subgrid" gridColumn="span 13">
                        <GridItem><Heading size="sm">Дата</Heading></GridItem>
                        <GridItem><Heading size="sm">БР</Heading></GridItem>
                        <GridItem><Heading size="sm">Бункеровка</Heading></GridItem>
                        <GridItem><Heading size="sm">T</Heading></GridItem>
                        <GridItem><Heading size="sm">5%</Heading></GridItem>
                        <GridItem><Heading size="sm">10%</Heading></GridItem>
                        <GridItem><Heading size="sm">15%</Heading></GridItem>
                        <GridItem><Heading size="sm">4x4</Heading></GridItem>
                        <GridItem><Heading size="sm">Усього</Heading></GridItem>
                        <GridItem><Heading size="sm">Розхід</Heading></GridItem>
                        <GridItem><Heading size="sm">Залишок</Heading></GridItem>
                        <GridItem><Heading size="sm">Одометр</Heading></GridItem>
                        <GridItem><Heading size="sm">Коментар</Heading></GridItem>
                    </Grid>

                    {fields.map((field, index) => {
                        return (
                            <Record last={index === fields.length - 1} key={field.id} onRemove={() => remove(index)} index={index} {...cumulative.itineraries[index]} />
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

export default memo(MasterNext)