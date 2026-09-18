import { NextRequest, NextResponse } from "next/server";
import { adminAuth, getUser } from "@/lib/firebaseAdmin";
import { authorizeAdminRequest } from "@/lib/auth";
import { isRole, ROLES } from "@/lib/session";

const NICKNAME_MAX_LENGTH = 64;

export async function PATCH(request: NextRequest) {
    const auth = await authorizeAdminRequest();
    if (!auth.ok) return auth.response;

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
    }

    const { uid, role, nickname } = (body ?? {}) as {
        uid?: unknown;
        role?: unknown;
        nickname?: unknown;
    };

    if (typeof uid !== "string" || uid.length === 0) {
        return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    if (role !== undefined && !isRole(role)) {
        return NextResponse.json(
            { error: `role must be one of: ${ROLES.join(", ")}` },
            { status: 400 },
        );
    }

    if (nickname !== undefined && (typeof nickname !== "string" || nickname.length > NICKNAME_MAX_LENGTH)) {
        return NextResponse.json(
            { error: `nickname must be a string of at most ${NICKNAME_MAX_LENGTH} characters` },
            { status: 400 },
        );
    }

    // Demoting yourself costs you the console you would need to undo it, and if
    // you are the only admin it costs everyone else theirs too.
    if (uid === auth.session.uid && role !== undefined && role !== "admin") {
        return NextResponse.json(
            { error: "You cannot change your own admin role" },
            { status: 400 },
        );
    }

    let existingClaims: Record<string, unknown>;

    try {
        existingClaims = (await getUser(uid)).customClaims ?? {};
    } catch {
        return NextResponse.json({ error: "No such user" }, { status: 404 });
    }

    // setCustomUserClaims replaces the whole claims object rather than merging,
    // so a PATCH carrying only a nickname used to silently drop the user's role.
    await adminAuth.setCustomUserClaims(uid, {
        ...existingClaims,
        ...(role !== undefined && { role }),
        ...(nickname !== undefined && { nickname }),
    });

    return NextResponse.json({
        success: true,
        uid,
        role: role ?? existingClaims.role ?? null,
    });
}
