'use client';
import { Controller, ControllerProps, FieldValues } from 'react-hook-form';
import { Input } from '@chakra-ui/react';
import { decimalToTimeString, timeStringToDecimal } from '@/lib/timeUtils';

type TimeInputProps<T extends FieldValues> = Omit<ControllerProps<T>, 'render'>;

export default function TimeInput<T extends FieldValues>(props: TimeInputProps<T>) {
    return (
        <Controller
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
    );
}