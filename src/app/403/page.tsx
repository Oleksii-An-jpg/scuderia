import { Button, EmptyState, VStack } from "@chakra-ui/react";
import Link from "next/link";
import { BiLock } from "react-icons/bi";

// (private)/layout.tsx redirects here when a signed-in user is not an admin.
// Without this route that redirect landed on a 404.
export default function Page() {
    return <EmptyState.Root>
        <EmptyState.Content>
            <EmptyState.Indicator>
                <BiLock />
            </EmptyState.Indicator>
            <VStack textAlign="center">
                <EmptyState.Title>Доступ заборонено</EmptyState.Title>
                <EmptyState.Description>
                    Ця сторінка доступна лише адміністраторам.
                </EmptyState.Description>
            </VStack>
            <Button asChild variant="subtle">
                <Link href="/">На головну</Link>
            </Button>
        </EmptyState.Content>
    </EmptyState.Root>
}
