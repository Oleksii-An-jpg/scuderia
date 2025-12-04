'use client';

import {FC} from "react";
import {Button, VStack, Link as ChakraLink} from "@chakra-ui/react";
import Link from "next/link";
import {usePathname} from "next/navigation";

const Navigation: FC = () => {
    const pathname = usePathname();
    return <VStack align="stretch">
        <Button disabled={pathname === '/admin/users'} asChild variant="subtle" colorPalette="gray">
            <ChakraLink asChild>
                <Link prefetch={false} href="/admin/users">Користувачі</Link>
            </ChakraLink>
        </Button>
        <Button disabled={pathname === '/admin/vehicles'} asChild variant="subtle" colorPalette="gray">
            <ChakraLink asChild>
                <Link prefetch={false} href="/admin/vehicles">Транспортні засоби</Link>
            </ChakraLink>
        </Button>
        <Button colorPalette="blue" disabled asChild variant="subtle">
            <ChakraLink asChild>
                <Link prefetch={false} href="#">Бекапи (у роботі)</Link>
            </ChakraLink>
        </Button>
        <Button asChild colorPalette="green">
            <ChakraLink asChild>
                <Link prefetch={false} href="/">Дорожні листи (головна)</Link>
            </ChakraLink>
        </Button>
    </VStack>
}

export default Navigation