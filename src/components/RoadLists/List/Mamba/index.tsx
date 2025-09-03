import {FC} from "react";
import {MambaRoadList} from "@/components/RoadLists";
import {Box, Button, Card, Heading, HStack, Link as ChakraLink, Table} from "@chakra-ui/react";
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
            <HStack justifyContent="space-between">
                <Heading size="md">Дорожні листи</Heading>
                <Box>
                    <Button asChild size="sm" colorPalette="blue">
                        <ChakraLink asChild>
                            <Link href="/"><BiNotepad /> Новий лист</Link>
                        </ChakraLink>
                    </Button>
                </Box>
            </HStack>
        </Card.Header>
        <Card.Body>
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>
                            <Heading size="sm">Період</Heading>
                        </Table.ColumnHeader>
                        <Table.ColumnHeader>
                            <Heading size="sm">Загальна тривалість</Heading>
                        </Table.ColumnHeader>
                        <Table.ColumnHeader>
                            <Heading size="sm">Загальний розхід</Heading>
                        </Table.ColumnHeader>
                        <Table.ColumnHeader>
                            <Heading size="sm">Залишок палива</Heading>
                        </Table.ColumnHeader>
                        <Table.ColumnHeader>
                            <Heading size="sm">Дії</Heading>
                        </Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {docs.map(doc => <MambaItem docs={docs} key={doc.id} doc={doc} docID={docID}  />)}
                </Table.Body>
            </Table.Root>
        </Card.Body>
    </Card.Root>
}

export default MambaList;