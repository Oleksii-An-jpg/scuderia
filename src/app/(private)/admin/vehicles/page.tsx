'use server';

import {getAllRoadListsServer, getAllVehiclesServer} from "@/lib/firebaseAdmin";
import Vehicles from "@/components/Vehicles";
import {setup} from "@/lib/subdomain";

export default async function Page() {
    const db = await setup();
    const vehicles = await getAllVehiclesServer(db);
    const roadLists = await getAllRoadListsServer(db);

    return <Vehicles vehicles={vehicles} roadLists={roadLists} />
}