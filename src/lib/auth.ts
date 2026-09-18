import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { adminAuth, getUser } from "@/lib/firebaseAdmin";
import { isRole, Role, SESSION_COOKIE } from "@/lib/session";

export type Session = {
    uid: string;
    role: Role | null;
    nickname: string | null;
};

/**
 * Resolve the caller from their Firebase session cookie.
 *
 * Returns null whenever the caller cannot be identified: no cookie, an expired
 * or forged one, or a cookie whose user has been disabled or signed out
 * server-side. Callers treat null as "not authenticated", never as "no opinion".
 */
export async function getSession(): Promise<Session | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie) return null;

    let uid: string;
    let claims: Record<string, unknown>;

    try {
        // checkRevoked: a disabled user or a server-side sign-out has to take
        // effect now, not when the 14-day cookie happens to expire.
        const decoded = await adminAuth.verifySessionCookie(sessionCookie.value, true);
        uid = decoded.uid;

        // Read the role off the user record rather than off the cookie. The
        // cookie is a 14-day snapshot of the claims it was minted with, so
        // trusting it means a role granted after sign-in never applies and,
        // worse, a role taken away does not either.
        claims = (await getUser(uid)).customClaims ?? {};
    } catch {
        return null;
    }

    return {
        uid,
        role: isRole(claims.role) ? claims.role : null,
        nickname: typeof claims.nickname === "string" ? claims.nickname : null,
    };
}

/**
 * Reject a mutating request that a third-party site sent with the user's cookie
 * riding along. The session cookie is SameSite=Lax, which already blocks this
 * for cross-site form posts and fetches; this is the second lock.
 *
 * A request with no Origin header is not a browser navigation, so it carries no
 * ambient cookie the caller did not set deliberately.
 */
async function isSameOrigin(): Promise<boolean> {
    const headerList = await headers();
    const origin = headerList.get("origin");

    if (!origin) return true;

    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

export type AdminAuthResult =
    | { ok: true; session: Session }
    | { ok: false; response: NextResponse };

/**
 * The guard every handler under /admin/api runs first. Route handlers are not
 * wrapped by (private)/layout.tsx — layouts only wrap pages — so each one has to
 * check for itself.
 */
export async function authorizeAdminRequest(): Promise<AdminAuthResult> {
    if (!(await isSameOrigin())) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 }),
        };
    }

    const session = await getSession();

    if (!session) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Not signed in" }, { status: 401 }),
        };
    }

    if (session.role !== "admin") {
        return {
            ok: false,
            response: NextResponse.json({ error: "Admin role required" }, { status: 403 }),
        };
    }

    return { ok: true, session };
}

/** The same check for pages, where the answer to a failure is a redirect. */
export async function requireAdminPage(): Promise<Session> {
    const session = await getSession();

    if (!session) redirect("/auth");
    if (session.role !== "admin") redirect("/403");

    return session;
}
