import {FC, memo} from "react";
import {Controller, useFormContext} from "react-hook-form";
import {F250RoadListAppModel} from "@/models/mamba";
import {Badge, Field, Grid, GridItem, HStack, IconButton, Input, Text, Textarea} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import {BiTrash} from "react-icons/bi";

type RecordProps = {
    index: number
    rowHours: number
    rowConsumed: number
    cumulativeHours: number
    cumulativeFuel: number
    onRemove: () => void
    last: boolean;
}

const Record: FC<RecordProps> = ({ index, onRemove, rowHours, rowConsumed, cumulativeHours, cumulativeFuel, last }) => {
    const { control, register } = useFormContext<F250RoadListAppModel>();

    return <Grid templateColumns="subgrid" gridColumn="span 13">
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
                    step={1}
                    size="2xs"
                    {...register(`itineraries.${index}.fuel`, { valueAsNumber: true })}
                />
            </Field.Root>
        </GridItem>
        <GridItem>
            <Field.Root>
                <Input placeholder="км" type="number" size="2xs" step={1} autoComplete="off" {...register(`itineraries.${index}.t`, { valueAsNumber: true })} />
            </Field.Root>
        </GridItem>
        <GridItem>
            <Field.Root>
                <Input placeholder="км" type="number" size="2xs" step={1} autoComplete="off" {...register(`itineraries.${index}.5%`, { valueAsNumber: true })} />
            </Field.Root>
        </GridItem>
        <GridItem>
            <Field.Root>
                <Input placeholder="км" type="number" size="2xs" step={1} autoComplete="off" {...register(`itineraries.${index}.10%`, { valueAsNumber: true })} />
            </Field.Root>
        </GridItem>
        <GridItem>
            <Field.Root>
                <Input placeholder="км" type="number" size="2xs" step={1} autoComplete="off" {...register(`itineraries.${index}.15%`, { valueAsNumber: true })} />
            </Field.Root>
        </GridItem>
        <GridItem>
            <Field.Root>
                <Input placeholder="км" type="number" size="2xs" step={1} autoComplete="off" {...register(`itineraries.${index}.4x4`, { valueAsNumber: true })} />
            </Field.Root>
        </GridItem>
        <GridItem>
            <Field.Root>
                <Input
                    disabled
                    size="2xs"
                    variant="subtle"
                    value={rowHours}
                />
            </Field.Root>
        </GridItem>
        <GridItem alignSelf="center">
            <Text textStyle="sm">{Math.round(rowConsumed)}</Text>
        </GridItem>
        <GridItem alignSelf="center">
            <Text textStyle="sm" {...(last && {
                fontWeight: "bold",
            })}>{cumulativeFuel}</Text>
        </GridItem>
        <GridItem alignSelf="center">
            <Badge colorPalette="purple" size="lg">
                {/* Actually km, but keeping the naming consistent */}
                <Text fontWeight="bold">{cumulativeHours}</Text>
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