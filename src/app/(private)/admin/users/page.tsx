'use server';

import {getAllUsers} from "@/lib/firebaseAdmin";
import Users from "@/components/Users";

export default async function Page() {
    const users = await getAllUsers();

    return <Users users={users.map(user => ({
        displayName: user.displayName ?? null,
        email: user.email ?? null,
        phoneNumber: user.phoneNumber ?? null,
        uid: user.uid ?? null,
        photoURL: user.photoURL ?? null,
        customClaims: user.customClaims
    }))} />
}