import {FC, useMemo} from "react";
import Link from "next/link";
import {Badge, Button, Text, Link as ChakraLink, Table, HStack} from "@chakra-ui/react";
import {formatDecimalHours, getTotalFueling, getTotalUsage} from "@/components/RoadLists/Edit/Mamba";
import {MambaRoadList} from "@/components/RoadLists";

type MambaItemProps = {
    doc: MambaRoadList
    docs: MambaRoadList[]
    docID: string | null
}

const MambaItem: FC<MambaItemProps> = ({ doc, docs, docID }) => {
    const {time, fuel} = useMemo(() => {
        return getTotalUsage(doc)
    }, [doc]);
    const {fueling} = useMemo(() => {
        const index = docs.findIndex(d => d.id === doc.id);
        const slice = docID ? docs.slice(index) : docs;
        const fueling = slice.reduce((acc, doc) => {
            acc += getTotalFueling(doc);
            return acc;
        }, 0);

        return {
            fueling: Math.floor(fueling * 1000) / 1000
        }

    }, [docs, doc, docID]);
    const active = docID === doc.id;

    return <Table.Row bg={active ? 'gray.100' : ''}>
        <Table.Cell>
            <Badge colorPalette="blue" size="lg">
                <Text fontWeight="bold">
                    {new Intl.DateTimeFormat('uk-UA', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit'
                    }).format(doc.start)} — {new Intl.DateTimeFormat('uk-UA', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit'
                }).format(doc.end)}
                </Text>
            </Badge>
        </Table.Cell>
        <Table.Cell>
            <Text fontWeight="bold">{formatDecimalHours(time)}</Text>
        </Table.Cell>
        <Table.Cell>
            <Text fontWeight="bold">{fuel}</Text>
        </Table.Cell>
        <Table.Cell>
            <Text fontWeight="bold" color={fueling < 0 ? 'red.500' : 'green.500'}>{fueling}</Text>
        </Table.Cell>
        <Table.Cell>
            <HStack>
                <ChakraLink asChild>
                    <Link href={`?id=${doc.id}`}>
                        <Button size="xs" colorScheme="blue" disabled={active}>
                            Переглянути
                        </Button>
                    </Link>
                </ChakraLink>
            </HStack>
        </Table.Cell>
    </Table.Row>
}

export default MambaItem;