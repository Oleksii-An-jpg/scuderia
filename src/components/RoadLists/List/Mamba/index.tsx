import {FC} from "react";
import {MambaRoadList} from "@/components/RoadLists";
import {Box, Button, Card, Grid, GridItem, Heading, Text, Link as ChakraLink} from "@chakra-ui/react";
import Link from "next/link";
import {BiNotepad} from "react-icons/bi";
import MambaItem from "@/components/RoadLists/List/Mamba/Item";

type MambaListProps = {
    docs: MambaRoadList[]
    docID: string | null
}

const MambaList: FC<MambaListProps> = ({ docs, docID }) => {
    return <Card.Root>
        <Card.Header>
            <Heading size="md">Дорожні листи</Heading>
            <Box>
                <Button asChild size="sm" colorScheme="teal" variant="outline">
                    <ChakraLink asChild>
                        <Link href="/">Новий лист <BiNotepad /></Link>
                    </ChakraLink>
                </Button>
            </Box>
        </Card.Header>
        <Card.Body>
            <Grid gridTemplateColumns="1fr 1fr 1fr" gap={2}>
                <GridItem p={2}>
                    <Text fontWeight="bold" textStyle="sm">
                        Дати
                    </Text>
                </GridItem>
                <GridItem p={2}>
                    <Text fontWeight="bold" textStyle="sm">
                        Всього годин
                    </Text>
                </GridItem>
                <GridItem p={2}>
                    <Text fontWeight="bold" textStyle="sm">
                        Загальний розхід
                    </Text>
                </GridItem>
                {docs.map(doc => <MambaItem key={doc.id} doc={doc} docID={docID}  />)}
            </Grid>
        </Card.Body>
    </Card.Root>
}

export default MambaList;