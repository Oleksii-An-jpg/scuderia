import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * A cheap early-out in front of everything under /admin, so a request with no
 * session never reaches a page or a route handler at all.
 *
 * This deliberately only checks that a cookie is present. Middleware runs on the
 * Edge runtime, where firebase-admin cannot run, so the cookie cannot be
 * verified here and a present-but-forged cookie sails straight through. The real
 * check — verifying the cookie and the admin claim — lives in
 * (private)/layout.tsx for pages and in authorizeAdminRequest() for every route
 * handler. Neither of them may lean on this.
 */
export function middleware(request: NextRequest) {
    if (request.cookies.has(SESSION_COOKIE)) {
        return NextResponse.next();
    }

    if (request.nextUrl.pathname.startsWith("/admin/api/")) {
        return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = "";

    return NextResponse.redirect(url);
}

export const config = {
    matcher: ["/admin/:path*"],
};
