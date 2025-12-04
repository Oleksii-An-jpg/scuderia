// src/components/ItineraryRow/index.tsx

'use client';
import {FC, memo, useEffect} from 'react';
import {Controller, useFormContext} from 'react-hook-form';
import {
    Badge,
    Field,
    Grid,
    GridItem,
    HStack,
    IconButton,
    Input,
    Text,
    Textarea,
    FileUpload,
    useFileUploadContext,
} from '@chakra-ui/react';
import DatePicker from 'react-datepicker';
import {BiTrash, BiUpload, BiX} from 'react-icons/bi';
import {RoadList, CalculatedItinerary} from '@/types/roadList';
import { Vehicle, isBoat, getModes } from '@/types/vehicle';
import {selectVehicleById, useVehicleStore} from '@/lib/vehicleStore';
import { decimalToTimeString } from '@/lib/timeUtils';
import TimeInput from '@/components/TimeInput';
import 'react-datepicker/dist/react-datepicker.css';
import Link from "next/link";

type Props = {
    index: number;
    vehicle: Vehicle;
    calculated?: CalculatedItinerary;
    onRemove: () => void;
    isLast: boolean;
}

const FileUploadList = () => {
    const fileUpload = useFileUploadContext()
    const files = fileUpload.acceptedFiles
    if (files.length === 0) return null
    return (
        <FileUpload.ItemGroup>
            <HStack>
                {files.map((file) => (
                    <FileUpload.Item
                        w="auto"
                        p="2"
                        py={1}
                        file={file}
                        key={file.name}
                    >
                        <Link prefetch={false} target="_blank" href={`https://storage.googleapis.com/scuderia-docs/${file.name}`}>
                            <Text fontSize="xs">{file.name}</Text>
                        </Link>
                        <FileUpload.ItemDeleteTrigger alignSelf="center" boxSize="4" layerStyle="fill.solid">
                            <BiX />
                        </FileUpload.ItemDeleteTrigger>
                    </FileUpload.Item>
                ))}
            </HStack>
        </FileUpload.ItemGroup>
    )
}

const ItineraryRow: FC<Props> = ({ index, vehicle, calculated, onRemove, isLast }) => {
    const { control, register, watch, setValue } = useFormContext<RoadList>();
    const vehicleConfig = useVehicleStore(state => selectVehicleById(state, vehicle));
    const modes = getModes(vehicleConfig);
    const files = watch(`itineraries.${index}.docs`);

    useEffect(() => {
        async function parseDocs() {
            if (files && files.length > 0 && files?.every(file => typeof file === 'string')) {
                const docs = await Promise.all(files.map(async (image) => {
                    const imageUrl = `https://storage.googleapis.com/scuderia-docs/${image}`
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    return new File([blob], image, {type: blob.type});
                }));
                setValue(`itineraries.${index}.docs`, docs);
            }
        }

        parseDocs();
    }, [files]);

    // Calculate column span: 3 (date, br, fuel) + modes.length + 7 (total, consumed, cumFuel, L motor, P motor, comment, files)
    const totalColumns = 3 + modes.length + (isBoat(vehicleConfig) ? 7 : 6);

    const rowHours = calculated?.rowHours ?? 0;
    const rowConsumed = calculated?.rowConsumed ?? 0;
    const cumulativeFuel = calculated?.cumulativeFuel ?? 0;
    const cumulativeHours = calculated?.cumulativeHours ?? (isBoat(vehicleConfig) ? { left: 0, right: 0 } : 0);

    return (
        <Controller name={`itineraries.${index}.docs`} control={control} render={({ field }) => <FileUpload.Root onFileChange={({ acceptedFiles }) => {
            field.onChange(acceptedFiles);
        }} acceptedFiles={files?.every(file => file instanceof File) ? files : []} maxFiles={Infinity} className={`!grid-cols-subgrid !grid`} gridColumn={`span ${totalColumns}`}>
            <Grid templateColumns="subgrid" gridColumn={`span ${totalColumns}`}>
                {/* Date */}
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

                {/* BR */}
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

                {/* Fuel */}
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

                {/* Dynamic mode fields */}
                {modes.map(mode => (
                    <GridItem key={mode.id}>
                        <Field.Root>
                            {isBoat(vehicleConfig) ? (
                                // @ts-expect-error: dynamic keys
                                <TimeInput name={`itineraries.${index}.${mode.id}`} control={control} />
                            ) : (
                                <Input
                                    autoComplete="off"
                                    type="number"
                                    step={0.1}
                                    size="2xs"
                                    // @ts-expect-error: dynamic keys
                                    {...register(`itineraries.${index}.${mode.id}`, { valueAsNumber: true })}
                                />
                            )}
                        </Field.Root>
                    </GridItem>
                ))}

                {/* Total (rowHours) */}
                <GridItem>
                    <Field.Root invalid={isBoat(vehicleConfig) && rowHours != null && Math.round(rowHours * 60) % 6 !== 0}>
                        <Input
                            disabled
                            size="2xs"
                            variant="subtle"
                            value={isBoat(vehicleConfig) ? decimalToTimeString(rowHours) : Math.round(rowHours)}
                        />
                    </Field.Root>
                </GridItem>

                {/* Consumed */}
                <GridItem alignSelf="center">
                    <Text textStyle="sm">{Math.round(rowConsumed)}</Text>
                </GridItem>

                {/* Cumulative Fuel */}
                <GridItem alignSelf="center">
                    <Text textStyle="sm" {...(isLast && { fontWeight: 'bold' })}>
                        {Math.round(cumulativeFuel)}
                    </Text>
                </GridItem>

                {isBoat(vehicleConfig) ? (
                    <>
                        <GridItem alignSelf="center">
                            <Badge colorPalette="purple" size="lg">
                                <Text fontWeight="bold">
                                    {typeof cumulativeHours === 'object'
                                        ? Math.round(cumulativeHours.left * 10) / 10
                                        : Math.round(cumulativeHours * 10) / 10
                                    }
                                </Text>
                            </Badge>
                        </GridItem>

                        {/* P Motor */}
                        <GridItem alignSelf="center">
                            <Badge colorPalette="purple" size="lg">
                                <Text fontWeight="bold">
                                    {typeof cumulativeHours === 'object'
                                        ? Math.round(cumulativeHours.right * 10) / 10
                                        : Math.round(cumulativeHours * 10) / 10
                                    }
                                </Text>
                            </Badge>
                        </GridItem>
                    </>
                ) : <GridItem>
                    <GridItem alignSelf="center">
                        <Badge colorPalette="purple" size="lg">
                            <Text fontWeight="bold">
                                {typeof cumulativeHours === 'object'
                                    ? Math.round(cumulativeHours.right * 10) / 10
                                    : Math.round(cumulativeHours * 10) / 10
                                }
                            </Text>
                        </Badge>
                    </GridItem>
                </GridItem>}

                <GridItem>
                    <FileUpload.HiddenInput />
                    <FileUpload.Trigger asChild>
                        <IconButton variant="outline" size="xs">
                            <BiUpload />
                        </IconButton>
                    </FileUpload.Trigger>
                </GridItem>
                <GridItem gridColumn="inherit" order={totalColumns + 1}>
                    <FileUploadList />
                </GridItem>

                {/* Comment & Delete */}
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
        </FileUpload.Root>} />
    );
};

export default memo(ItineraryRow);