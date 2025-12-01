"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, getAuth, onAuthStateChanged, User } from "firebase/auth";
import {createSession} from "@/app/actions";

export default function LoginButton() {
    const [user, setUser] = useState<User | null>(null);
    const [adminData, setAdminData] = useState<null>(null);

    useEffect(() => {
        const auth = getAuth();
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return () => unsub();
    }, []);

    async function handleLogin() {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const token = await result.user.getIdToken(true);

        setUser(result.user);
        await createSession(token);
    }

    async function handleLogout() {
        await signOut(auth);
        setUser(null);
        setAdminData(null);
    }

    return (
        <div className="space-y-4">
            {user ? (
                <>
                    <p>✅ Logged in as {user.email}</p>
                    <button
                        onClick={handleLogout}
                        className="px-3 py-2 bg-gray-600 text-white rounded-lg"
                    >
                        Logout
                    </button>
                    <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(adminData, null, 2)}</pre>
                </>
            ) : (
                <button
                    onClick={handleLogin}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                >
                    Login with Google
                </button>
            )}
        </div>
    );
}
