'use client';
import {forwardRef, memo, useCallback, useEffect, useImperativeHandle, useState} from "react";
import {MambaRoadListAppModel, MambaRoadListUIModel} from "@/models/mamba";
import {FormProvider, useFieldArray, useForm, useWatch} from "react-hook-form";
import {calculateCumulative} from "@/calculator";
import {Button, Field, Grid, GridItem, Heading, HStack, Input, Separator, Text, VStack} from "@chakra-ui/react";
import {decimalToTimeString} from "@/components/TimeInput";
import Summary from "@/components/RoadLists/MambaNext/Summary";
import {BiPlus} from "react-icons/bi";
import Record from "@/components/RoadLists/MambaNext/Record";
import {upsertDoc} from "@/db";

type MambaNextProps = {
    model: MambaRoadListAppModel
    onBeforeSubmit: () => void;
    onAfterSubmit: () => void;
}

const MambaNext = forwardRef<{
    invalid: boolean
}, MambaNextProps>(({ model, onBeforeSubmit, onAfterSubmit }, ref) => {
    const methods = useForm<MambaRoadListAppModel>({
        defaultValues: model,
    });
    const { control, reset, register, handleSubmit, formState: { errors } } = methods;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "itineraries"
    });

    const [itineraries, startHours, startFuel] = useWatch({
        control,
        name: ["itineraries", "startHours", "startFuel"],
    });

    useImperativeHandle(ref, () => {
        return {
            invalid: !!errors?.root?.cumulativeTime
        }
    }, [errors?.root?.cumulativeTime]);

    const [cumulative, setCumulative] = useState<MambaRoadListUIModel>(() => {
        return calculateCumulative({
            ...model,
            itineraries, startHours, startFuel
        }) as MambaRoadListUIModel;
    })

    useEffect(() => {
        const timer = setTimeout(() => {
            setCumulative(calculateCumulative({
                ...model,
                itineraries, startHours, startFuel,
            }) as MambaRoadListUIModel)
        }, 100);

        return () => clearTimeout(timer);
    }, [itineraries, startHours, startFuel]);

    useEffect(() => {
        reset(model);
    }, [model, reset]);

    const handleFormSubmit = useCallback(async (data: MambaRoadListAppModel) => {
        onBeforeSubmit();

        const dates = data.itineraries.map(item => item.date.getTime());

        const minDate = new Date(Math.min(...dates));
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
            hh: null,
            mh: null,
            sh: null,
            ph: null,
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
                            <Field.Label>Напрацювання (год)</Field.Label>
                            <Input size="xs" disabled value={decimalToTimeString(startHours)} />
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
                        <GridItem><Heading size="sm">ХХ</Heading></GridItem>
                        <GridItem><Heading size="sm">МХ</Heading></GridItem>
                        <GridItem><Heading size="sm">СХ</Heading></GridItem>
                        <GridItem><Heading size="sm">ПХ</Heading></GridItem>
                        <GridItem><Heading size="sm">Усього</Heading></GridItem>
                        <GridItem><Heading size="sm">Розхід</Heading></GridItem>
                        <GridItem><Heading size="sm">Залишок</Heading></GridItem>
                        <GridItem><Heading size="sm">Л Мотор</Heading></GridItem>
                        <GridItem><Heading size="sm">П Мотор</Heading></GridItem>
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
})

export default memo(MambaNext)