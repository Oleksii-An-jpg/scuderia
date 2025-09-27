import {FC, useEffect, useMemo, useCallback, memo} from "react";
import {Itinerary, MambaRoadList} from "@/models";
import {
    Controller,
    ControllerProps, FieldValues,
    FormProvider,
    useFieldArray, UseFieldArrayRemove,
    useForm,
    useFormContext,
    useWatch
} from "react-hook-form";
import {
    Badge, Button,
    Field,
    Grid,
    GridItem,
    Heading,
    HStack, IconButton,
    Input,
    Separator,
    Text,
    Textarea,
    VStack
} from "@chakra-ui/react";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {BiPlus, BiTrash} from "react-icons/bi";
import {upsertDoc} from "@/db";

type MambaProps = {
    record: MambaRoadList;
}

export const decimalToTimeString = (decimal: number | null): string => {
    if (decimal == null) return '';

    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const timeStringToDecimal = (timeString: string): number | null => {
    if (!timeString) return null;

    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
};

function TimeInput<T extends FieldValues>(props: Omit<ControllerProps<T>, 'render'>) {
    return <Controller
        {...props}
        render={({ field: { onChange, value, ...field } }) => (
            <Input
                size="2xs"
                type="time"
                value={decimalToTimeString(value)}
                onChange={(e) => onChange(timeStringToDecimal(e.target.value))}
                {...field}
            />
        )}
    />
}

// Pure calculation functions moved outside component
export const calculateConsumed = (hh: number | null, mh: number | null, sh: number | null, ph: number | null): number => {
    return Math.round(((hh || 0) * 6.3 + (mh || 0) * 31.2 + (sh || 0) * 137 + (ph || 0) * 253) * 100) / 100;
};

export const calculateHours = (hh: number | null, mh: number | null, sh: number | null, ph: number | null): number => {
    return (hh || 0) + (mh || 0) + (sh || 0) + (ph || 0);
};

// Memoized calculation hook to avoid recalculating on every render
const useRecordCalculations = (
    currentItinerary: Itinerary,
    previousIt: Itinerary,
    startHours: number | null,
    startFuel: number | null,
    index: number
) => {
    return useMemo(() => {
        const { hh = 0, sh = 0, mh = 0, ph = 0, fuel = 0 } = currentItinerary || {};

        // Hours and fuel consumed for THIS record
        const currentHours = calculateHours(hh, mh, sh, ph);
        const currentConsumed = calculateConsumed(hh, mh, sh, ph);

        const cumulativeHours =
            index === 0 ? currentHours + (startHours || 0) : (previousIt?.hours || 0) + currentHours;

        const cumulativeRemain =
            (index === 0 ? startFuel || 0 : previousIt?.remain || 0) +
            (fuel || 0) -
            currentConsumed;

        return {
            total: currentHours,
            consumed: currentConsumed,
            hours: cumulativeHours,
            remain: Math.round(cumulativeRemain * 100) / 100
        };
    }, [currentItinerary, previousIt, startHours, startFuel, index]);
};

type RecordProps = {
    index: number;
    remove: UseFieldArrayRemove;
}

const Record = memo<RecordProps>(({ index, remove }) => {
    const { control, register, setValue, formState: { errors } } = useFormContext<MambaRoadList>();

    const [startHours, startFuel] = useWatch({
        control,
        name: ['startHours', 'startFuel']
    });

    const currentItinerary = useWatch({
        control,
        name: `itineraries.${index}`
    });

    const previousIt = useWatch({
        control,
        name: `itineraries.${index - 1}`
    });

    const calculations = useRecordCalculations(currentItinerary, previousIt, startHours, startFuel, index);

    // Debounced effect to reduce setValue calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setValue(`itineraries.${index}.total`, calculations.total, { shouldValidate: true });
            setValue(`itineraries.${index}.consumed`, calculations.consumed, { shouldValidate: false });
            setValue(`itineraries.${index}.remain`, calculations.remain, { shouldValidate: false });
            setValue(`itineraries.${index}.hours`, calculations.hours, { shouldValidate: false });
        }, 50); // Small debounce to batch updates

        return () => clearTimeout(timer);
    }, [calculations, setValue, index]);

    const handleRemove = useCallback(() => remove(index), [remove, index]);

    return (
        <Grid templateColumns="subgrid" gridColumn="span 13">
            <GridItem>
                <Field.Root>
                    <Controller
                        name={`itineraries.${index}.date`}
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
            </GridItem>
            <GridItem>
                <Field.Root>
                    <Input
                        autoComplete="off"
                        type="number"
                        min={0}
                        step={1}
                        size="2xs"
                        {...register(`itineraries.${index}.br`, { valueAsNumber: true })}
                    />
                </Field.Root>
            </GridItem>
            <GridItem>
                <Field.Root>
                    <Input
                        autoComplete="off"
                        type="number"
                        min={0}
                        step={1}
                        size="2xs"
                        {...register(`itineraries.${index}.fuel`, { valueAsNumber: true })}
                    />
                </Field.Root>
            </GridItem>
            <GridItem>
                <Field.Root>
                    <TimeInput name={`itineraries.${index}.hh`} control={control} />
                </Field.Root>
            </GridItem>
            <GridItem>
                <Field.Root>
                    <TimeInput name={`itineraries.${index}.mh`} control={control} />
                </Field.Root>
            </GridItem>
            <GridItem>
                <Field.Root>
                    <TimeInput name={`itineraries.${index}.sh`} control={control} />
                </Field.Root>
            </GridItem>
            <GridItem>
                <Field.Root>
                    <TimeInput name={`itineraries.${index}.ph`} control={control} />
                </Field.Root>
            </GridItem>
            <GridItem>
                <Field.Root invalid={!!errors.itineraries?.[index]?.total}>
                    <Controller
                        rules={{
                            validate: (value) => {
                                if (value === null) return true;
                                const totalMinutes = Math.round(value * 60);
                                return (totalMinutes % 6 === 0) || "Не кратне 6 хвилинам";
                            }
                        }}
                        render={({ field: { onChange, value, ...field } }) => {
                            return (
                                <Input
                                    disabled
                                    size="2xs"
                                    variant="subtle"
                                    value={decimalToTimeString(value)}
                                    onChange={(e) => onChange(timeStringToDecimal(e.target.value))}
                                    {...field}
                                />
                            )
                        }}
                        name={`itineraries.${index}.total`}
                        control={control}
                    />
                </Field.Root>
            </GridItem>
            <GridItem alignSelf="center">
                <Text textStyle="sm">{calculations.consumed}</Text>
            </GridItem>
            <GridItem alignSelf="center">
                <Text textStyle="sm">{calculations.remain}</Text>
            </GridItem>
            <GridItem alignSelf="center">
                <Badge colorPalette="purple" size="lg">
                    <Text fontWeight="bold">{decimalToTimeString(calculations.hours)}</Text>
                </Badge>
            </GridItem>
            <GridItem alignSelf="center">
                <Badge colorPalette="purple" size="lg">
                    <Text fontWeight="bold">{decimalToTimeString(calculations.hours)}</Text>
                </Badge>
            </GridItem>
            <GridItem>
                <HStack>
                    <Field.Root>
                        <Textarea
                            maxH="2lh"
                            resize="none"
                            size="xs"
                            {...register(`itineraries.${index}.comment`)}
                        />
                    </Field.Root>
                    <IconButton
                        onClick={handleRemove}
                        size="xs"
                        colorPalette="red"
                        variant="outline"
                        aria-label="Видалити"
                    >
                        <BiTrash />
                    </IconButton>
                </HStack>
            </GridItem>
        </Grid>
    );
});

// Optimized summary calculation component - using useWatch for better performance
const SummaryRow = memo(() => {
    const { control } = useFormContext<MambaRoadList>();

    // Use useWatch to subscribe to the itineraries array - this will trigger on any field change
    const itineraries = useWatch({
        control,
        name: "itineraries"
    });

    const summaryData = useMemo(() => {
        if (!itineraries || !Array.isArray(itineraries)) {
            return { hh: 0, sh: 0, mh: 0, ph: 0, total: 0, consumed: 0, remain: 0 };
        }

        let hh = 0, mh = 0, sh = 0, ph = 0, fuel = 0;

        itineraries.forEach((item) => {
            if (item) {
                hh += item.hh || 0;
                mh += item.mh || 0;
                sh += item.sh || 0;
                ph += item.ph || 0;
                fuel += item.fuel || 0;
            }
        });

        const consumed = Math.round((hh * 6.3 + mh * 31.2 + sh * 137 + ph * 253) * 100) / 100;
        const remain = Math.round((fuel - consumed) * 100) / 100;
        return { hh, sh, mh, ph, total: hh + sh + mh + ph, consumed, remain };
    }, [itineraries]);

    return (
        <>
            <GridItem colStart={3}>
                <Heading size="sm">Разом:</Heading>
            </GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(summaryData.hh)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(summaryData.mh)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(summaryData.sh)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(summaryData.ph)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{decimalToTimeString(summaryData.total)}</Heading></GridItem>
            <GridItem><Heading textStyle="sm">{summaryData.consumed}</Heading></GridItem>
        </>
    );
});

const Mamba: FC<MambaProps> = ({ record }) => {
    const methods = useForm({
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