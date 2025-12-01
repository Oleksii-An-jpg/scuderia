'use server';

import {getAllVehiclesServer} from "@/lib/firebaseAdmin";
import Vehicles from "@/components/Vehicles";
import {setup} from "@/lib/subdomain";

export default async function Page() {
    const db = await setup();
    const vehicles = await getAllVehiclesServer(db);

    return <Vehicles vehicles={vehicles} />
}