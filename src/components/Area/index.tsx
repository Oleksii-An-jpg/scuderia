'use client';

import {FC} from "react";
import {useForm} from "react-hook-form";
import {Button, Clipboard, Field, Heading, InputGroup, Textarea, VStack} from "@chakra-ui/react";
import ClipboardIconButton from "@/components/ClipboardIconButton";

const convertToDD = (match: RegExpMatchArray) => {
    const degrees = parseFloat(match[1]);
    const minutes = parseFloat(match[2]);
    const direction = match[3];

    let dd = degrees + minutes / 60;

    if (direction === 'S' || direction === 'W') {
        dd = dd * -1;
    }

    return dd;
};

const processCoordinates = (input: string) => {
    const coordRegex = /(\d+)°\s*(\d+\.?\d*)'([NSEW])/g;
    const matches = Array.from(input.matchAll(coordRegex));
    const pairs: string[] = [];

    // Process original matches
    for (let i = 0; i < matches.length; i += 2) {
        if (matches[i] && matches[i + 1]) {
            const lat = convertToDD(matches[i]);
            const lon = convertToDD(matches[i + 1]);

            // First entry gets 10, all subsequent entries (including standard ones) get 15
            const thirdColumn = i === 0 ? 10 : 15;

            pairs.push(`${lat.toFixed(7)}\t${lon.toFixed(7)}\t${thirdColumn}`);
        }
    }

    // Duplicate the first coordinate pair to the end, but force the value to 15
    if (pairs.length > 0) {
        const firstPairSplit = pairs[0].split('\t');
        const closedLoopLine = `${firstPairSplit[0]}\t${firstPairSplit[1]}\t15`;
        pairs.push(closedLoopLine);
    }

    return pairs;
};

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
            const pairs = processCoordinates(data.input);
            setValue('output', pairs.join('\n'));
        })}>
            <Field.Root>
                <Field.Label>Input</Field.Label>
                <Textarea {...register('input')} />
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
