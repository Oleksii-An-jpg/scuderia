import {FC, memo, useCallback, useEffect} from "react";
import {KMARRoadList} from "@/models";
import {FormProvider, useFieldArray, useForm} from "react-hook-form";
import {upsertDoc} from "@/db";
import {Button, Field, Grid, GridItem, Heading, HStack, Input, Separator, Text, VStack} from "@chakra-ui/react";
import TimeInput from "@/components/TimeInput";
import Record from "@/components/RoadLists/KMAR/Record";
import SummaryRow from "@/components/RoadLists/Mamba/SummaryRow";
import {BiPlus} from "react-icons/bi";

type KMARProps = {
    record: KMARRoadList;
    onSubmit: () => Promise<void>;
}

export const calculateConsumed = (hh: number | null, mh: number | null, sh: number | null): number => {
    return Math.round(((hh || 0) * 5.5 + (mh || 0) * 54.7 + (sh || 0) * 199) * 100) / 100;
};

export const calculateHours = (hh: number | null, mh: number | null, sh: number | null): number => {
    return (hh || 0) + (mh || 0) + (sh || 0);
};

const KMAR: FC<KMARProps> = ({ record, onSubmit }) => {
    const methods = useForm<KMARRoadList>({
        defaultValues: record,
        mode: 'onChange',
    });

    const { control, reset, register, handleSubmit } = methods;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "itineraries"
    });

    useEffect(() => {
        reset(record);
    }, [record]);

    const handleAppend = useCallback(() => {
        append({
            date: new Date(),
            br: null,
            fuel: null,
            hh: null,
            mh: null,
            sh: null,
            total: null,
        });
    }, [append]);

    const handleFormSubmit = useCallback(async (data: KMARRoadList) => {
        const { currentHours, consumedFuel, ...rest } = data;
        await upsertDoc(rest, record.id);
        await onSubmit();
    }, [record.id]);

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
                            <TimeInput {...register("startHours")} control={control} />
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

                    {fields.map((field, index) => (
                        <Record key={field.id} index={index} remove={remove} />
                    ))}

                    <SummaryRow />
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

export default memo<KMARProps>(KMAR);
