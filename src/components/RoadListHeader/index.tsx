// src/components/RoadListHeader/index.tsx

'use client';
import { FC } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Checkbox, Field, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react';
import DatePicker from 'react-datepicker';
import { RoadList } from '@/types/roadList';
import type { Balance } from '@/components/RoadLists';
import { Vehicle, isBoat } from '@/types/vehicle';
import {selectVehicleById, useVehicleStore} from '@/lib/vehicleStore';
import 'react-datepicker/dist/react-datepicker.css';

type Props = {
    vehicle: Vehicle;
    // The balance carried in from the previous road list, or null when this road
    // list opens the chain and therefore always sets its own.
    carried: Balance | null;
}

// Shown in place of the editable field while the balance is carried forward.
const CarriedValue: FC<{ value: number }> = ({ value }) => (
    <Input size="xs" variant="subtle" disabled readOnly value={value} />
);

const RoadListHeader: FC<Props> = ({ vehicle, carried }) => {
    const { control, register, watch } = useFormContext<RoadList>();
    const vehicleConfig = useVehicleStore(state => selectVehicleById(state, vehicle));
    const resetBalance = watch('resetBalance');
    if (!vehicleConfig) return null;

    const isBoatVehicle = isBoat(vehicleConfig);

    // While the balance is carried, these fields only mirror the previous road
    // list, so they are shown but not editable.
    const locked = !!carried && !resetBalance;
    const carriedHours = carried?.hours;

    return (
        <VStack alignItems="stretch" gap={2}>
            <Heading size="md">На початок зміни</Heading>

            {carried ? (
                <HStack gap={3}>
                    <Controller
                        name="resetBalance"
                        control={control}
                        render={({ field }) => (
                            <Checkbox.Root
                                size="sm"
                                checked={!!field.value}
                                onCheckedChange={({ checked }) => field.onChange(checked === true)}
                            >
                                <Checkbox.HiddenInput ref={field.ref} onBlur={field.onBlur} />
                                <Checkbox.Control />
                                <Checkbox.Label>Задати залишок вручну</Checkbox.Label>
                            </Checkbox.Root>
                        )}
                    />
                    <Text textStyle="xs" color="fg.muted">
                        {locked
                            ? 'Переноситься з попереднього дорожнього листа'
                            : 'Відлік починається заново з цих значень'}
                    </Text>
                </HStack>
            ) : null}

            <HStack>
                <Field.Root w="auto">
                    <Field.Label>Паливо (л)</Field.Label>
                    {locked && carried ? (
                        <CarriedValue value={Math.round(carried.fuel)} />
                    ) : (
                        <Input
                            size="xs"
                            autoComplete="off"
                            type="number"
                            {...register('startFuel', { valueAsNumber: true })}
                        />
                    )}
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
                            {locked && typeof carriedHours === 'object' ? (
                                <CarriedValue value={carriedHours.left} />
                            ) : (
                                <Input
                                    size="xs"
                                    autoComplete="off"
                                    type="number"
                                    step={0.01}
                                    {...register('startHours.left', { valueAsNumber: true })}
                                />
                            )}
                        </Field.Root>

                        <Field.Root w="auto">
                            <Field.Label>
                                П двигун (год.дес)
                            </Field.Label>
                            {locked && typeof carriedHours === 'object' ? (
                                <CarriedValue value={carriedHours.right} />
                            ) : (
                                <Input
                                    size="xs"
                                    autoComplete="off"
                                    type="number"
                                    step={0.01}
                                    {...register('startHours.right', { valueAsNumber: true })}
                                />
                            )}
                        </Field.Root>
                    </>
                ) : <Field.Root w="auto">
                    <Field.Label>
                        Загальний пробіг (км)
                    </Field.Label>
                    {locked && typeof carriedHours === 'number' ? (
                        <CarriedValue value={Math.round(carriedHours)} />
                    ) : (
                        <Input
                            size="xs"
                            autoComplete="off"
                            type="number"
                            step={0.01}
                            {...register('startHours', { valueAsNumber: true })}
                        />
                    )}
                </Field.Root>}
            </HStack>
        </VStack>
    );
};

export default RoadListHeader;
