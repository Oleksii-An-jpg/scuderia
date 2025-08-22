import {FC} from "react";
import {Field, Input} from "@chakra-ui/react";
import {useFormContext} from "react-hook-form";

export const Kmar: FC = () => {
    const { register } = useFormContext();
    return <Field.Root>
        <Field.Label>
            Дата
            <Field.RequiredIndicator />
        </Field.Label>
        <Input type="date" lang="uk-ua" {...register('date')} />
        <Field.HelperText />
        <Field.ErrorText />
    </Field.Root>
}