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
    value?: string
}

const Clip: FC<ClipProps> = ({ value }) => {
    return <Clipboard.Root w="100px" value={value}>
        <InputGroup endElement={<ClipboardIconButton />}>
            <Clipboard.Input asChild>
                <Input size="2xs" />
            </Clipboard.Input>
        </InputGroup>
    </Clipboard.Root>
}

export default Clip;