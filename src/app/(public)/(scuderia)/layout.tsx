'use server'

import { adminAuth, getUser } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

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
            redirect("/403");
        }
    } catch {
        redirect("/auth");
    }

    return children;
}