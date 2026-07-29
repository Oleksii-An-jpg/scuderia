'use client';

import {FC} from "react";
import {auth} from "@/lib/firebase";
import {Button} from "@chakra-ui/react";

const SignOut: FC = () => {
    return <Button
        size="sm"
        onClick={() => auth.signOut()}
        colorPalette="orange"
        variant="subtle"
    >
        Вийти
    </Button>
}

export default SignOut;
