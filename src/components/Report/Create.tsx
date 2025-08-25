'use client';
import {FC, useEffect, useMemo} from "react";
import {
    Card,
    HStack,
    Field,
    Input,
    NativeSelect,
    Heading,
    IconButton,
    VStack,
    Grid,
    GridItem,
    Text,
    Button,
    Separator,
} from "@chakra-ui/react";
import {useForm, useFieldArray, FormProvider} from "react-hook-form";
import {Mamba, Report} from "@/components/Report/Mamba";
import {BiPlus, BiTrash} from 'react-icons/bi'
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
    if (hours === 0) return `${minutes} хв.`;
    if (minutes === 0) return `${hours} год.`;
    return `${hours} год. ${minutes} хв.`;
}

const Create: FC<CreateProps> = ({ doc, onSubmit }) => {
    const methods = useForm<RoadList>({
        defaultValues: doc || {
            records: [
                {
                    departure: new Date()
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
                        departure: new Date()
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

    const { hours, minutes } = useMemo(() => {
        return {
            hours: Array.from({ length: 24 }, (_, i) => i),
            minutes: Array.from({ length: 10 }, (_, i) => i * 6)
        }
    }, []);

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
                        <VStack align="stretch" gap={4}>
                            <Field.Root invalid={!!errors.vehicle}>
                                <Field.Label>Транспортний засіб</Field.Label>
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
                            {vehicle && <Grid templateColumns="repeat(12, auto)" gap={2}>
                                <GridItem>
                                    <Text textStyle="sm">Вибуття</Text>
                                </GridItem>
                                <GridItem>
                                    <Text textStyle="sm">Прибуття</Text>
                                </GridItem>
                                <GridItem>
                                    <Text textStyle="sm">БР</Text>
                                </GridItem>
                                <GridItem>
                                    <Text textStyle="sm">Бункеровка</Text>
                                </GridItem>
                                <GridItem>
                                    <Text textStyle="sm">Холостий хід</Text>
                                </GridItem>
                                <GridItem>
                                    <Text textStyle="sm">Малий хід</Text>
                                </GridItem>
                                <GridItem>
                                    <Text textStyle="sm">Слабий хід</Text>
                                </GridItem>
                                <GridItem>
                                    <Text textStyle="sm">Повний хід</Text>
                                </GridItem>
                                <GridItem>
                                    <Text textStyle="sm">Усього</Text>
                                </GridItem>
                                <GridItem>
                                    <Text textStyle="sm">Розхід</Text>
                                </GridItem>
                                <GridItem>
                                    <Text textStyle="sm">Залишок</Text>
                                </GridItem>
                                {fields.map((field, index) => {
                                    return (
                                        <Grid templateColumns="subgrid" gridColumn="span 12" key={field.id}>
                                            <GridItem>
                                                <Field.Root>
                                                    <Input size="xs" type="datetime-local" lang="uk-ua" {...register(`records.${index}.departure`, {
                                                        required: true
                                                    })} />
                                                    <Field.ErrorText />
                                                </Field.Root>
                                            </GridItem>
                                            <GridItem>
                                                <Field.Root>
                                                    <Input size="xs" type="datetime-local" lang="uk-ua" {...register(`records.${index}.arrival`, {
                                                        required: true
                                                    })} />
                                                    <Field.ErrorText />
                                                </Field.Root>
                                            </GridItem>
                                            <GridItem>
                                                <Field.Root>
                                                    <Input size="xs" type="number" min={1} {...register(`records.${index}.br`, {
                                                        valueAsNumber: true,
                                                        required: true
                                                    })} />
                                                    <Field.ErrorText />
                                                </Field.Root>
                                            </GridItem>
                                            <GridItem>
                                                <Field.Root>
                                                    <Input size="xs" type="number" {...register(`records.${index}.fueling`, {
                                                        valueAsNumber: true
                                                    })} />
                                                    <Field.ErrorText />
                                                </Field.Root>
                                            </GridItem>
                                            {vehicle === Vehicle.MAMBA && (
                                                <Mamba index={index} hours={hours} minutes={minutes} />
                                            )}
                                            <GridItem>
                                                <IconButton size="xs" colorPalette="red" onClick={() => remove(index)}><BiTrash /></IconButton>
                                            </GridItem>
                                        </Grid>
                                    )
                                })}
                                <GridItem colSpan={12}>
                                    <Separator />
                                </GridItem>
                                {vehicle === Vehicle.MAMBA && <Report records={records} />}
                            </Grid>}
                        </VStack>
                    </Card.Body>
                    <Card.Footer>
                        <HStack justify="space-between" width="full">
                            <Button size="xs" onClick={() => append({})} colorPalette="green" disabled={!vehicle}>
                                Додати запис <BiPlus />
                            </Button>
                            <Button loading={isSubmitting} disabled={!isValid} type="submit" size="xs" colorPalette="blue">
                                Зберегти
                            </Button>
                        </HStack>
                    </Card.Footer>
                </Card.Root>
            </form>
        </FormProvider>
    )
}

export default Create;