'use client';
import { FC } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Field, Heading, HStack, Input, VStack } from '@chakra-ui/react';
import DatePicker from 'react-datepicker';
import { RoadList } from '@/types/roadList';
import { Vehicle, isBoat } from '@/types/vehicle';
import 'react-datepicker/dist/react-datepicker.css';

type Props = {
    vehicle: Vehicle;
}

const RoadListHeader: FC<Props> = ({ vehicle }) => {
    const { control, register } = useFormContext<RoadList>();
    const isBoatVehicle = isBoat(vehicle);

    return (
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
                        {...register('startFuel', { valueAsNumber: true })}
                    />
                </Field.Root>

                <Field.Root w="auto">
                    <Field.Label>Дорожній лист</Field.Label>
                    <Input size="xs" autoComplete="off" {...register('roadListID')} />
                </Field.Root>

                <Field.Root w="auto">
                    <Field.Label>Дата початку</Field.Label>
                    <Controller
                        name="start"
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

                {isBoatVehicle ? (
                    <>
                        <Field.Root w="auto">
                            <Field.Label>
                                Л двигун (год.дес)
                            </Field.Label>
                            <Input
                                size="xs"
                                autoComplete="off"
                                type="number"
                                step={0.01}
                                {...register('startHours.left', { valueAsNumber: true })}
                            />
                        </Field.Root>

                        <Field.Root w="auto">
                            <Field.Label>
                                П двигун (год.дес)
                            </Field.Label>
                            <Input
                                size="xs"
                                autoComplete="off"
                                type="number"
                                step={0.01}
                                {...register('startHours.right', { valueAsNumber: true })}
                            />
                        </Field.Root>
                    </>
                ) : <Field.Root w="auto">
                    <Field.Label>
                        Загальний пробіг (км)
                    </Field.Label>
                    <Input
                        size="xs"
                        autoComplete="off"
                        type="number"
                        step={0.01}
                        {...register('startHours', { valueAsNumber: true })}
                    />
                </Field.Root>}
            </HStack>
        </VStack>
    );
};

export default RoadListHeader;