'use client';

import {FC} from "react";
import {auth} from "@/lib/firebase";
import {Button} from "@chakra-ui/react";
import {signOut} from "firebase/auth";

const SignOut: FC = () => {
    const handleSignOut = () => {
        return signOut(auth);
    }
    return <Button
        size="sm"
        onClick={handleSignOut}
        colorPalette="orange"
        variant="subtle"
    >
        Вийти
    </Button>
}

export default SignOut;
