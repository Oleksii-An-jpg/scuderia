'use server'

import { adminAuth, getUser } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import {Alert, VStack} from "@chakra-ui/react";
import SignOut from "@/components/SignOut";

const ROLES = ['editor', 'admin', 'viewer'] as const;

export default async function ScuderiaLayout({ children }: { children: ReactNode }) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) redirect("/auth");

    try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie.value, true);

        let role = decoded.role;
        if (role == null) {
            const user = await getUser(decoded.uid);
            role = user.customClaims?.role;
        }

        if (role == null || !ROLES.includes(role)) {
            return <VStack>
                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                        <Alert.Title>Доступ заборонено</Alert.Title>
                        <Alert.Description>
                            Вам потрібні права адміністратора для доступу до цією сторінки. Для отримання таких прав, зв&#39;яжіться з командиром.
                        </Alert.Description>
                    </Alert.Content>
                    <SignOut />
                </Alert.Root>
            </VStack>
        }
    } catch {
        redirect("/auth");
    }

    return children;
}