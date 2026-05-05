'use client';

import {FC} from "react";
import {useForm} from "react-hook-form";
import {Button, Clipboard, Field, Heading, InputGroup, Textarea, VStack} from "@chakra-ui/react";
import ClipboardIconButton from "@/components/ClipboardIconButton";
import {processCoordinates} from "@/lib/planning/types";

type Values = {
    input: string;
    output: string;
}

const Area: FC = () => {
    const { register, watch, setValue, handleSubmit, formState: { isDirty, isValid } } = useForm<Values>({
        defaultValues: {
            input: '',
            output: ''
        }
    });

    const [output] = watch(['output']);

    return <VStack align="stretch">
        <Heading>Area Map Generator</Heading>
        <VStack gap={4} as="form" align="stretch" onSubmit={handleSubmit((data) => {
            const { combined } = processCoordinates(data.input);
            setValue('output', combined.join('\n'));
        })}>
            <Field.Root>
                <Field.Label>Input</Field.Label>
                <Textarea rows={5} {...register('input')} />
            </Field.Root>
            <Button type="submit" colorPalette="pink" disabled={!isDirty || !isValid}>Generate Area</Button>
            <Clipboard.Root value={output}>
                <Clipboard.Label>
                    <Heading size="md" mb={2}>Area</Heading>
                </Clipboard.Label>
                <InputGroup endElement={<ClipboardIconButton />}>
                    <Clipboard.Input asChild>
                        <Textarea variant="subtle" rows={20} fontFamily="mono" placeholder="Area appears here..." value={output} readOnly />
                    </Clipboard.Input>
                </InputGroup>
            </Clipboard.Root>
        </VStack>
    </VStack>
}

export default Area;
