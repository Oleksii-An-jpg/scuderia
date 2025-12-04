'use server'

import {adminAuth} from "@/lib/firebaseAdmin";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {ReactNode} from "react";
import {Card, HStack} from "@chakra-ui/react";
import Navigation from "@/components/Navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) redirect("/auth");

    try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie.value, true);
        if (decoded.role !== 'admin') redirect("/403");
    } catch {
        redirect("/auth");
    }

    return <HStack align="start" gap={8}>
        <Navigation />
        <Card.Root flex={1}>
            {children}
        </Card.Root>
    </HStack>
}