'use client';
import {FC, useCallback, useEffect, useMemo, useState} from "react";
import {BaseItinerary, getAllRoadLists, RoadList, Vehicle} from "@/db";
import {Card, CardBody, Field, NativeSelect, VStack} from "@chakra-ui/react";
import {useSearchParams} from "next/navigation";
import {useForm} from "react-hook-form";
import Mamba from "@/components/RoadLists/Edit/Mamba";
import MambaList from "@/components/RoadLists/List/Mamba";

export type MambaUsage = {
    hh: number | null;
    mh: number | null;
    sh: number | null;
    ph: number | null;
    left?: number | null;
    right?: number | null;
}

type KMARUsage = {
    km_start: number | null;
}

export type MambaRoadList = RoadList<BaseItinerary & MambaUsage & {
    total: string | null;
}>;

export type KMARRoadList = RoadList<BaseItinerary & KMARUsage & {
    total: number | null;
}>;

export function isMambaRoadList(doc: RoadList): doc is MambaRoadList {
    return doc.vehicle === Vehicle.MAMBA;
}

export function isKMARRoadList(doc: RoadList): doc is KMARRoadList {
    return doc.vehicle === Vehicle.KMAR;
}

type Values = {
    vehicle: Vehicle
}

const RoadLists: FC = () => {
    const params = useSearchParams();
    const docID = params.get("id");
    const [docs, setDocs] = useState<RoadList[]>([]);
    const [loading, setLoading] = useState(true);
    const sync = useCallback(async () => {
        setLoading(true);
        const result = await getAllRoadLists();

        if (result.success && result.data) {
            setDocs(result.data)
        }

        setLoading(false);
    }, []);

    const onUpsert = useCallback((data: RoadList, id?: string) => {
        setDocs((prev) => {
            const index = prev.findIndex(d => d.id === id);
            if (index !== -1) {
                const updated = [...prev];
                updated[index] = { ...data, id: id! };
                return updated;
            } else {
                return [{ ...data, id: id! }, ...prev];
            }
        });
    }, []);
    const { watch, register } = useForm<Values>({
        defaultValues: {
            vehicle: Vehicle.MAMBA
        }
    });

    const vehicle = watch("vehicle");

    const data = useMemo(() => {
        const mamba = docs.filter(isMambaRoadList);
        const kmar = docs.filter(isKMARRoadList);

        return {
            mamba,
            kmar,
        }
    }, [docs]);

    useEffect(() => {
        sync();
    }, []);
    return <VStack alignItems="stretch">
        {loading ? "Loading..." : <>
            <Card.Root>
                <Card.Header>
                    <Field.Root>
                        <Field.Label textStyle="sm" fontWeight="bold">Транспортний засіб</Field.Label>
                        <NativeSelect.Root size="xs">
                            <NativeSelect.Field {...register("vehicle")}>
                                {[Vehicle.MAMBA, Vehicle.KMAR].map(v => <option key={v} value={v}>{v}</option>)}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    </Field.Root>
                </Card.Header>
                <CardBody>
                    {vehicle === Vehicle.MAMBA && <Mamba docs={data.mamba} docID={docID} onUpsert={onUpsert} />}
                </CardBody>
            </Card.Root>
            {vehicle === Vehicle.MAMBA && <MambaList docs={data.mamba} docID={docID} />}
        </>}
    </VStack>
}

export default RoadLists;