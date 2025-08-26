'use client';
import {FC, Fragment, useEffect} from "react";
import {
    Card,
    HStack,
    Field,
    Input,
    NativeSelect,
    Heading,
    IconButton,
    VStack,
    GridItem,
    Button,
    Separator, SimpleGrid, Box, Textarea
} from "@chakra-ui/react";
import {useForm, useFieldArray, FormProvider} from "react-hook-form";
import {Mamba, Report} from "@/components/Report/Mamba";
import {BiPlus, BiSave, BiTrash} from 'react-icons/bi'
import {RoadList, upsertDoc, Vehicle} from "@/db";
import {useSearchParams} from "next/navigation";

type CreateProps = {
    doc?: RoadList
    onSubmit: (doc: RoadList) => void
}

export const convertToDecimalHours = (hours: number, minutes: number): number => {
    return hours + (minutes / 60);
};

export const formatMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Fallback for unsupported browsers
    if (hours === 0) return `00:${minutes < 10 ? `0${minutes}` : minutes}`;
    if (minutes === 0) return `${hours}:00`;
    return `${hours < 10 ? `0${hours}` : hours}:${minutes < 10 ? `0${minutes}` : minutes}`;
}

const Create: FC<CreateProps> = ({ doc, onSubmit }) => {
    const methods = useForm<RoadList>({
        defaultValues: doc || {
            records: [
                {
                    date: new Date(),
                }
            ]
        }
    });

    const { register, control, formState: { errors, isValid, isSubmitting }, watch, handleSubmit, reset } = methods;

    const params = useSearchParams();
    const id = params.get('id');
    useEffect(() => {
        reset(doc);

        if (id == null) {
            reset({
                records: [
                    {
                        date: new Date()
                    }
                ]
            })
        }
    }, [doc, id]);
    const { fields, append, remove } = useFieldArray({
        control,
        name: "records",
    });

    const [vehicle, records] = watch(["vehicle", 'records']);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(async (data) => {
                const { id, ...rest } = data;
                await upsertDoc(rest, id);
                onSubmit(data);
            })}>
                <Card.Root>
                    <Card.Header>
                        <Heading>
                            Дорожній лист
                        </Heading>
                    </Card.Header>
                    <Card.Body>
                        <VStack align="stretch">
                            <Box>
                                <Field.Root invalid={!!errors.vehicle}>
                                    <Field.Label>🚌 Транспортний засіб</Field.Label>
                                    <NativeSelect.Root size="xs">
                                        <NativeSelect.Field
                                            placeholder="Оберіть транспортний засіб"
                                            {...register("vehicle", {
                                                required: true
                                            })}
                                        >
                                            {[Vehicle.MAMBA, Vehicle.KMAR].map((vehicle) => (
                                                <option key={vehicle} value={vehicle}>
                                                    {vehicle}
                                                </option>
                                            ))}
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                    <Field.ErrorText>{errors.vehicle?.message}</Field.ErrorText>
                                </Field.Root>
                            </Box>
                            <SimpleGrid templateColumns="9em 4.5em 9em repeat(5, 4em) repeat(2,minmax(5em,8em)) 1fr" gap={2} alignItems="end">
                                {vehicle && <>
                                    {fields.map((field, index) => {
                                        return (
                                            <Fragment key={field.id}>
                                                <Box>
                                                    <Field.Root>
                                                        {index === 0 && <Field.Label>📅 Дата</Field.Label>}
                                                        <Input size="xs" type="date" lang="uk-ua" {...register(`records.${index}.date`, {
                                                            required: true
                                                        })} />
                                                        <Field.ErrorText />
                                                    </Field.Root>
                                                </Box>
                                                <Box>
                                                    <Field.Root>
                                                        {index === 0 && <Field.Label>📋 БР</Field.Label>}
                                                        <Input size="xs" type="number" min={1} {...register(`records.${index}.br`, {
                                                            valueAsNumber: true,
                                                            required: true
                                                        })} />
                                                        <Field.ErrorText />
                                                    </Field.Root>
                                                </Box>
                                                <Box>
                                                    <Field.Root>
                                                        {index === 0 && <Field.Label>⛽ Бункеровка (л)</Field.Label>}
                                                        <Input size="xs" type="number" {...register(`records.${index}.fueling`, {
                                                            valueAsNumber: true
                                                        })} />
                                                        <Field.ErrorText />
                                                    </Field.Root>
                                                </Box>
                                                {vehicle === Vehicle.MAMBA && (
                                                    <Mamba index={index} records={records} />
                                                )}
                                                <Box>
                                                    <Field.Root>
                                                        {index === 0 && <Field.Label>Коментар</Field.Label>}
                                                        <Textarea resize="none" maxH="2lh" size="xs" {...register(`records.${index}.comment`)} />
                                                        <Field.ErrorText />
                                                    </Field.Root>
                                                </Box>
                                                <HStack>
                                                    <IconButton disabled={records.length === 1} size="xs" colorPalette="red" onClick={() => remove(index)}><BiTrash /></IconButton>
                                                </HStack>
                                                <GridItem colSpan={12}>
                                                    <Separator variant="dashed" />
                                                </GridItem>
                                            </Fragment>
                                        )
                                    })}
                                    {vehicle === Vehicle.MAMBA && records.length > 1 && <Report records={records} />}
                                </>
                                }
                            </SimpleGrid>
                        </VStack>
                    </Card.Body>
                    <Card.Footer>
                        <HStack justify="space-between" width="full">
                            <Button size="xs" onClick={() => append({})} colorPalette="green" disabled={!vehicle}>
                                Додати запис <BiPlus />
                            </Button>
                            <Button loading={isSubmitting} disabled={!isValid} type="submit" size="xs" colorPalette="blue">
                                Зберегти <BiSave />
                            </Button>
                        </HStack>
                    </Card.Footer>
                </Card.Root>
            </form>
        </FormProvider>
    )
}

export default Create;