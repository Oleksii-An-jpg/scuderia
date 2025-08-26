import {Field, Input} from "@chakra-ui/react";
import {withMask} from "use-mask-input";
import {Controller, ControllerProps, FieldValues} from "react-hook-form";
import {useMemo, ReactNode} from "react";

export const getTime = (time: string) => {
    return  time.split(':').map(Number);
}

const getRandomInt = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);

    const number = Math.floor(Math.random() * (max - min)) + min;

    if (number < 10) {
        return `0${number}`;
    }

    return number;
}

type TimeProps<T extends FieldValues> = Omit<ControllerProps<T>, 'render'> & {
    label?: ReactNode;
}

export function Time<T extends FieldValues>({ rules, label, ...props }: TimeProps<T>)  {
    const { hours, minutes } = useMemo(() => {
        return {
            hours: getRandomInt(0, 23),
            minutes: getRandomInt(0, 59)
        }
    }, [])
    return <Controller render={({ field: { value, ...field } }) => {
        return <Field.Root>
            <Field.Label>{label}</Field.Label>
            <Input autoComplete="off" size="xs" placeholder={`${hours}:${minutes}`} {...field} value={value || ''} ref={withMask("99:99")} />
            <Field.ErrorText />
        </Field.Root>
    }} {...props} rules={{
        ...rules,
        validate: (value) => {
            if (typeof value === 'string') {
                const [hours, minutes] = getTime(value);

                if (isNaN(hours) || isNaN(minutes)) {
                    return 'Invalid time format';
                }

                return true
            }
        }
    }} />
}
