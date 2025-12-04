import {NextRequest, NextResponse} from "next/server";
import {adminAuth} from "@/lib/firebaseAdmin";

export async function PATCH(request: NextRequest) {
    const { uid, role, nickname }: { uid: string, role?: string, nickname?: string } = await request.json();

    await adminAuth
        .setCustomUserClaims(uid, {
            ...(role && { role }),
            ...(nickname && { nickname: nickname }),
        });

    return NextResponse.json({ success: true, uid, role });
}