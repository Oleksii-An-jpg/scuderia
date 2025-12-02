import "server-only";
import { headers } from "next/headers";
import {getFirestore} from "firebase-admin/firestore";

export const setup = async () => {
    const headersList = await headers();
    const parts = (
        headersList.get("x-forwarded-host") ||
        headersList.get("host") ||
        ""
    ).split(".");
    if (parts.length > 1) {
        const [subdomain] = parts;
        return getFirestore(subdomain);
    }

    return getFirestore();
};