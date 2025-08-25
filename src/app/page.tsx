'use client';
import {VStack, Card} from "@chakra-ui/react";
import Create from "@/components/Report/Create";
import {List} from "@/components/Report/List";
import {useSearchParams} from "next/navigation";
import {Suspense, useEffect, useState} from "react";
import {getAllRoadLists, RoadList} from "@/db";
import {useToggle} from 'react-use';

export default function Page() {
    return <Suspense>
        <P />
    </Suspense>
}

function P() {
    const params = useSearchParams();
    const id = params.get('id');
    const [on, toggle] = useToggle(false);
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

  return (
      <VStack align="stretch">
          {on ? <>
              <Create doc={doc} onSubmit={doc => {
                    setDoc(doc);
                    // Refresh list
                    getAllRoadLists().then(({ data }) => {
                        setDocs(data);
                    });
              }} />
              <Card.Root>
                  <Card.Body>
                      <List id={id} docs={docs} />
                  </Card.Body>
              </Card.Root>
          </> : 'loading...'}
      </VStack>
  );
}
