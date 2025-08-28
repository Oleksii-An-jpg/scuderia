'use client';
import {Card, VStack} from "@chakra-ui/react";
import Create from "@/components/Report/Create";
import {List} from "@/components/Report/List";
import {useRouter, useSearchParams} from "next/navigation";
import {Suspense, useCallback, useEffect, useMemo, useState} from "react";
import {getAllRoadLists, RoadList, Vehicle} from "@/db";
import {useToggle} from 'react-use';
import {parseTime} from "@/components/Time";

export default function Page() {
    return <Suspense>
        <Scuderia />
    </Suspense>
}

const getTotalTimeByVehicle = (docs: RoadList[], vehicle: Vehicle) => {
    return docs?.filter(doc => doc.vehicle === vehicle).reduce((acc, doc) => {
        const time = doc.records.reduce((acc, record) => {
            if (record.total) {
                const time = parseTime(record.total);
                acc.hours += time?.hours ?? 0;
                acc.minutes += time?.minutes ?? 0;
            }
            return acc;
        }, {
            hours: 0,
            minutes: 0
        });
        acc.hours = time?.hours ?? 0;
        acc.minutes = time?.minutes ?? 0;
        return acc;
    }, {
        hours: 0,
        minutes: 0
    });
}

function Scuderia() {
    const params = useSearchParams();
    const { replace } = useRouter();
    const id = params.get('id');
    const [loaded, toggle] = useToggle(false);
    const [doc, setDoc] = useState<RoadList>();
    const [docs, setDocs] = useState<RoadList[]>();

    useEffect(() => {
        async function fetchDocs() {
            await getAllRoadLists().then(({ data }) => {
                setDocs(data);
            });
            toggle(true);
        }

        fetchDocs();
    }, []);

    useEffect(() => {
        if (id && docs) {
            const foundDoc = docs?.find(d => d.id === id);
            if (foundDoc) {
                setDoc(foundDoc);
            }
        }
    }, [id, docs]);

    const usageUntilDoc = useCallback((id?: string) => {
        const index = docs?.findIndex(d => d.id === id) ?? -1;
        const filteredDocs = index === - 1 ? docs || [] : docs?.slice(0, index) || []

        const mamba = getTotalTimeByVehicle(filteredDocs, Vehicle.MAMBA);
        const kmar = getTotalTimeByVehicle(filteredDocs, Vehicle.KMAR);

        console.log(docs);
        return {
            mamba,
            kmar
        }
    }, [docs]);

  return (
      <VStack align="stretch">
          {loaded ? <>
              <Create usageUntilDoc={usageUntilDoc} doc={doc} onSubmit={doc => {
                    setDoc(doc);
                    getAllRoadLists().then(({ data }) => {
                        setDocs(data);
                    });
              }} />
              <Card.Root>
                  <Card.Body>
                      <List id={id} docs={docs} onSubmit={(doc) => {
                            getAllRoadLists().then(({ data }) => {
                                setDocs(data);
                            });

                          if (doc.id === id) {
                              return replace('/');
                          }
                      }} />
                  </Card.Body>
              </Card.Root>
          </> : 'loading...'}
      </VStack>
  );
}
