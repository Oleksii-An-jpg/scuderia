import {FC, memo} from "react";
import {Controller, useFormContext} from "react-hook-form";
import {KMARRoadListAppModel} from "@/models/mamba";
import {Badge, Field, Grid, GridItem, HStack, IconButton, Input, Text, Textarea} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import TimeInput, {decimalToTimeString} from "@/components/TimeInput";
import {BiTrash} from "react-icons/bi";

type RecordProps = {
    index: number
    rowHours: number
    rowConsumed: number
    cumulativeHours: number
    cumulativeFuel: number
    onRemove: () => void
}

const Record: FC<RecordProps> = ({ index, rowHours, onRemove, rowConsumed, cumulativeHours, cumulativeFuel }) => {
    const { control, register } = useFormContext<KMARRoadListAppModel>();

    return <Grid templateColumns="subgrid" gridColumn="span 12">
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
            <Field.Root invalid={rowHours != null && Math.round(rowHours * 60) % 6 !== 0}>
                <Input
                    disabled
                    size="2xs"
                    variant="subtle"
                    value={decimalToTimeString(rowHours)}
                />
            </Field.Root>
        </GridItem>
        <GridItem alignSelf="center">
            <Text textStyle="sm">{rowConsumed}</Text>
        </GridItem>
        <GridItem alignSelf="center">
            <Text textStyle="sm">{cumulativeFuel}</Text>
        </GridItem>
        <GridItem alignSelf="center">
            <Badge colorPalette="purple" size="lg">
                <Text fontWeight="bold">{Math.round(cumulativeHours * 100) / 100}</Text>
            </Badge>
        </GridItem>
        <GridItem alignSelf="center">
            <Badge colorPalette="purple" size="lg">
                <Text fontWeight="bold">{Math.round(cumulativeHours * 100) / 100}</Text>
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
                    onClick={onRemove}
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
}

export default memo(Record);