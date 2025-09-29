'use client';
import {Controller, ControllerProps, FieldValues} from "react-hook-form";
import {Input} from "@chakra-ui/react";

export const decimalToTimeString = (decimal: number | null): string => {
    if (decimal == null) return '';

    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const timeStringToDecimal = (timeString: string): number | null => {
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

export default TimeInput