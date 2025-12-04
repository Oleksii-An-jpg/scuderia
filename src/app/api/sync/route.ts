import {NextRequest, NextResponse} from "next/server";
import {populateVehicles} from "@/scripts/populate";

export async function GET(_: NextRequest) {
    try {
        // await populateVehicles();

        return NextResponse.json({
            success: true,
            message: `Successfully synced categories`
        });

    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}