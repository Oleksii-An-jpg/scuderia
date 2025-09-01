import {FC, useMemo} from "react";
import Link from "next/link";
import {Grid, GridItem, Link as ChakraLink} from "@chakra-ui/react";
import {formatDecimalHours, getTotalUsage} from "@/components/RoadLists/Edit/Mamba";
import {MambaRoadList} from "@/components/RoadLists";

type MambaItemProps = {
    doc: MambaRoadList
    docID: string | null
}

const MambaItem: FC<MambaItemProps> = ({ doc, docID }) => {
    const usage = useMemo(() => {
        return getTotalUsage(doc)
    }, [doc])
    return <Grid asChild key={doc.id} bg={docID === doc.id ? 'gray.300' : undefined} _hover={{ bg: docID !== doc.id ? "gray.100" : '' }} templateColumns="subgrid" gridColumn="span 3" alignItems="center" gap={2}>
        <ChakraLink key={doc.id} asChild gridTemplateColumns="subgrid" gridColumn="span 3">
            <Link href={`?id=${doc.id}`}>
                <GridItem p={2}>
                    {new Intl.DateTimeFormat('uk-UA', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit'
                    }).format(doc.start)} — {new Intl.DateTimeFormat('uk-UA', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit'
                }).format(doc.end)}
                </GridItem>
                <GridItem p={2}>
                    {formatDecimalHours(usage)}
                </GridItem>
                <GridItem>
                    123
                </GridItem>
            </Link>
        </ChakraLink>
    </Grid>
}

export default MambaItem;