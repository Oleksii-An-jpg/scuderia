'use client';

import {FC} from "react";
import {auth} from "@/lib/firebase";
import {Button} from "@chakra-ui/react";
import {signOut} from "firebase/auth";
import {deleteSession} from "@/app/actions";

const SignOut: FC = () => {
    // Signing out of Firebase alone leaves the session cookie behind, and the
    // cookie is what the server trusts - so drop both.
    const handleSignOut = async () => {
        await signOut(auth);
        await deleteSession();
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
