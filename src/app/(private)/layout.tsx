'use server'

import {ReactNode} from "react";
import {Card, HStack} from "@chakra-ui/react";
import Navigation from "@/components/Navigation";
import {requireAdminPage} from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    // Guards the pages in this group only: route handlers are not wrapped by a
    // layout, so each one under admin/api runs authorizeAdminRequest() itself.
    await requireAdminPage();

    return <HStack align="start" gap={8}>
        <Navigation />
        <Card.Root flex={1}>
            {children}
        </Card.Root>
    </HStack>
}
