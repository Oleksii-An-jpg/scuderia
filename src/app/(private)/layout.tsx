'use server'

import {adminAuth} from "@/lib/firebaseAdmin";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {ReactNode} from "react";
import {Card} from "@chakra-ui/react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) redirect("/auth");

    try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie.value, true);
        if (!decoded.admin) redirect("/403");
    } catch {
        redirect("/auth");
    }

    // await adminAuth
    //         .setCustomUserClaims('8mrN16SztoSprkrhT8WDOBNX8Pg2', { admin: true })
    //         .then(() => {
    //             // The new custom claims will propagate to the user's ID token the
    //             // next time a new one is issued.
    //         });

    return <Card.Root>
        {children}
    </Card.Root>
}