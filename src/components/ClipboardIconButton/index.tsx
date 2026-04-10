import {FC} from "react";
import {Clipboard, IconButton} from "@chakra-ui/react";

const ClipboardIconButton: FC = () => {
    return (
        <Clipboard.Trigger asChild alignSelf="start">
            <IconButton colorPalette="pink" variant="surface" size="xs" mt={2}>
                <Clipboard.Indicator />
            </IconButton>
        </Clipboard.Trigger>
    )
}

export default ClipboardIconButton;