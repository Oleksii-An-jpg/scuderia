'use server';
import { cookies } from 'next/headers'
import { adminAuth } from "@/lib/firebaseAdmin";
import {redirect} from "next/navigation";
import {SESSION_COOKIE} from "@/lib/session";

export async function createSession(token: string) {
    const cookieStore = await cookies()
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days in ms
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });
    cookieStore.set({
        name: SESSION_COOKIE,
        value: sessionCookie,
        httpOnly: true,
        path: '/',
        secure: true,
        // Explicit rather than relying on the browser default: this cookie is the
        // only thing authorizing the admin API, so it must not ride along on a
        // request another site made.
        sameSite: 'lax',
        expires: Date.now() + expiresIn
    });

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    if (decoded.role === 'editor' || decoded.role === 'viewer') {
        redirect('/')
    }

    if (decoded.role === 'admin') {
        redirect('/admin')
    } else {
        redirect('/')
    }
}

export async function deleteSession() {
    const cookieStore = await cookies();

    cookieStore.delete(SESSION_COOKIE)

    redirect('/auth')
}