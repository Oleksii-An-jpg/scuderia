'use client'
import {FC} from "react";
import {Clipboard, IconButton, InputGroup, Input} from "@chakra-ui/react";

const ClipboardIconButton = () => {
    return (
        <Clipboard.Trigger asChild>
            <IconButton variant="surface" size="2xs" me="-2">
                <Clipboard.Indicator />
            </IconButton>
        </Clipboard.Trigger>
    )
}

type ClipProps = {
    value?: string;
    startElement?: string;
}

const Clip: FC<ClipProps> = ({ value, startElement }) => {
    return <Clipboard.Root w="120px" value={value}>
        <InputGroup startElement={startElement} endElement={<ClipboardIconButton />}>
            <Clipboard.Input asChild>
                <Input size="2xs" />
            </Clipboard.Input>
        </InputGroup>
    </Clipboard.Root>
}

export default Clip;