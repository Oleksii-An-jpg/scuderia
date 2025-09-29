'use client';
import {FC, useEffect, useCallback, memo} from "react";
import {MambaRoadList} from "@/models";
import {
    FormProvider,
    useFieldArray,
    useForm,
} from "react-hook-form";
import {
    Button,
    Field,
    Grid,
    GridItem,
    Heading,
    HStack,
    Input,
    Separator,
    Text,
    VStack
} from "@chakra-ui/react";
import 'react-datepicker/dist/react-datepicker.css';
import {BiPlus} from "react-icons/bi";
import {upsertDoc} from "@/db";
import SummaryRow from "@/components/RoadLists/Mamba/SummaryRow";
import TimeInput from "@/components/TimeInput";
import Record from "@/components/RoadLists/Mamba/Record";

type MambaProps = {
    record: MambaRoadList;
    onSubmit: () => Promise<void>;
}

// Pure calculation functions moved outside component
export const calculateConsumed = (hh: number | null, mh: number | null, sh: number | null, ph: number | null): number => {
    return Math.round(((hh || 0) * 6.3 + (mh || 0) * 31.2 + (sh || 0) * 137 + (ph || 0) * 253) * 100) / 100;
};

export const calculateHours = (hh: number | null, mh: number | null, sh: number | null, ph: number | null): number => {
    return (hh || 0) + (mh || 0) + (sh || 0) + (ph || 0);
};

const Mamba: FC<MambaProps> = ({ record, onSubmit }) => {
    const methods = useForm<MambaRoadList>({
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
    }, [record, reset]);

    const handleAppend = useCallback(() => {
        append({
            date: new Date(),
            br: null,
            fuel: null,
            hh: null,
            mh: null,
            sh: null,
            ph: null,
            total: null,
        });
    }, [append]);

    const handleFormSubmit = useCallback(async (data: MambaRoadList) => {
        const { currentHours, consumedFuel, ...rest } = data;
        await upsertDoc(rest, record.id);
        await onSubmit();
    }, [record.id]);

    return (
        <FormProvider {...methods}>
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
    );
};

export default memo(Mamba);