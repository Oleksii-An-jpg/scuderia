'use server';
import { cookies } from 'next/headers'
import { adminAuth } from "@/lib/firebaseAdmin";
import {redirect} from "next/navigation";

export async function createSession(token: string) {
    const cookieStore = await cookies()
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days in ms
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });
    cookieStore.set({
        name: 'session',
        value: sessionCookie,
        httpOnly: true,
        path: '/',
        secure: true,
        expires: Date.now() + expiresIn
    });

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    if (decoded.role === 'admin') {
        redirect('/admin')
    } else {
        redirect('/')
    }
}

export async function deleteSession() {
    const cookieStore = await cookies();

    cookieStore.delete('session')

    redirect('/auth')
}