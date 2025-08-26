'use client';
import {FC, useMemo} from "react";
import {RoadList} from "@/db";
import {Report} from "@/components/Report/Mamba";
import {Grid, GridItem, Heading, IconButton, Button, Link as ChakraLink, Text, VStack} from "@chakra-ui/react";
import NextLink from "next/link"
import {BiEdit, BiPlus} from "react-icons/bi";

type ListProps = {
    docs?: RoadList[]
    id: string | null
}

const Item: FC<{ doc: RoadList, active: boolean }> = ({ doc, active }) => {
    const { departure } = useMemo(() => {
        const departure = Math.min(doc.records.map(record => record.date ? new Date(record.date).getTime() : Infinity).reduce((a, b) => Math.min(a, b), Infinity));
        return { departure }
    }, [doc]);

    return <Grid templateColumns="subgrid" gridColumn="span 7" alignItems="center" className={active ? 'bg-amber-100' : ''}>
        <GridItem>
            <Text textStyle="sm">
                {new Intl.DateTimeFormat("uk-UA", {
                    dateStyle: "medium",
                    timeStyle: "long",
                    timeZone: "Europe/Kyiv",
                    timeZoneName: undefined
                }).format(departure)}
            </Text>
        </GridItem>
        <GridItem>
            <Text textStyle="sm">
                {doc.records[doc.records.length - 1]?.br}
            </Text>
        </GridItem>
        <GridItem>
            <Text textStyle="sm">
                {doc.vehicle}
            </Text>
        </GridItem>
        <Report records={doc.records} options={{
            idle: false,
            low: false,
            medium: false,
            full: false,
        }} />
        <GridItem>
            <IconButton asChild size="xs" variant="outline">
                <ChakraLink asChild>
                    <NextLink href={`/?id=${doc.id}`}>
                        <BiEdit />
                    </NextLink>
                </ChakraLink>
            </IconButton>
        </GridItem>
    </Grid>
}

export const List: FC<ListProps> = ({ docs, id }) => {
    return <VStack align="stretch" gap={4}>
        <div>
            <Button asChild size="xs" variant="outline" colorPalette="blue">
                <ChakraLink asChild>
                    <NextLink href={`/`}>
                        Новий дорожній лист <BiPlus />
                    </NextLink>
                </ChakraLink>
            </Button>
        </div>
        <Grid templateColumns="repeat(7, auto)" gap={2}>
            <GridItem>
                <Heading size="sm">Дата</Heading>
            </GridItem>
            <GridItem>
                <Heading size="sm">БР</Heading>
            </GridItem>
            <GridItem>
                <Heading size="sm">Т/З</Heading>
            </GridItem>
            <GridItem>
                <Heading size="sm">Тривалість</Heading>
            </GridItem>
            <GridItem>
                <Heading size="sm">Розхід</Heading>
            </GridItem>
            {docs?.map(doc => {
                return (
                    <Item doc={doc} key={doc.id} active={id === doc.id} />
                )
            })}
        </Grid>
    </VStack>
}
