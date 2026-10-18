import { redirect } from "next/navigation";
import Auth from "@/components/Auth";
import { getSession } from "@/lib/auth";

export default async function Page() {
    // A signed-in user has nothing to do here. Everyone else gets the login form,
    // which also clears whatever Firebase sign-in the browser kept from an
    // expired session.
    const session = await getSession();

    if (session) redirect(session.role === "admin" ? "/admin" : "/");

    return <Auth />
}
