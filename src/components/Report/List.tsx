'use client';
import {FC, useMemo} from "react";
import {deleteDocById, RoadList} from "@/db";
import {Report} from "@/components/Report/Mamba";
import {
    Grid,
    GridItem,
    Heading,
    IconButton,
    Button,
    Link as ChakraLink,
    Text,
    VStack,
    HStack,
    Dialog, Portal, CloseButton
} from "@chakra-ui/react";
import NextLink from "next/link"
import {BiEdit, BiPlus, BiTrash} from "react-icons/bi";
import {useForm} from "react-hook-form";

type ListProps = {
    docs?: RoadList[]
    id: string | null
    onSubmit: (doc: RoadList) => void
}

const Item: FC<{ doc: RoadList, active: boolean, onSubmit: (doc: RoadList) => void }> = ({ doc, active, onSubmit }) => {
    const departure = useMemo(() => {
        return Math.min(doc.records.map(record => record.date ? new Date(record.date).getTime() : Infinity).reduce((a, b) => Math.min(a, b), Infinity));
    }, [doc]);
    const { handleSubmit, formState: { isSubmitting } } = useForm<RoadList>({
        defaultValues: doc
    })

    return <Grid templateColumns="subgrid" gridColumn="span 7" alignItems="center" className={active ? 'bg-amber-100' : ''}>
        <GridItem>
            <Text textStyle="sm">
                {new Intl.DateTimeFormat("uk-UA", {
                    dateStyle: "medium",
                    timeZone: "Europe/Kyiv",
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
            <HStack>
                <IconButton asChild size="xs" variant="outline">
                    <ChakraLink asChild>
                        <NextLink href={`/?id=${doc.id}`}>
                            <BiEdit />
                        </NextLink>
                    </ChakraLink>
                </IconButton>
                <Dialog.Root role="alertdialog">
                    <Dialog.Trigger asChild>
                        <IconButton colorPalette="red" size="xs" variant="outline">
                            <BiTrash />
                        </IconButton>
                    </Dialog.Trigger>
                    <Portal>
                        <Dialog.Backdrop />
                        <Dialog.Positioner>
                            <Dialog.Content>
                                <Dialog.Header>
                                    <Dialog.Title>Ви впевнені?</Dialog.Title>
                                </Dialog.Header>
                                <Dialog.Body>
                                    <p>
                                        Цю дію неможливо скасувати. Це призведе до остаточного видалення дорожнього листа.
                                    </p>
                                </Dialog.Body>
                                <Dialog.Footer>
                                    <Dialog.ActionTrigger asChild>
                                        <Button variant="outline">Скасувати</Button>
                                    </Dialog.ActionTrigger>
                                    <Dialog.Context>
                                        {(store) => (
                                            <Button loading={isSubmitting} onClick={handleSubmit(async (data) => {
                                                if (data.id) {
                                                    await deleteDocById(data.id);
                                                    store.setOpen(false);
                                                    onSubmit(doc);
                                                }
                                            })} colorPalette="red">Видалити</Button>
                                        )}
                                    </Dialog.Context>
                                </Dialog.Footer>
                                <Dialog.CloseTrigger asChild>
                                    <CloseButton size="sm" />
                                </Dialog.CloseTrigger>
                            </Dialog.Content>
                        </Dialog.Positioner>
                    </Portal>
                </Dialog.Root>
            </HStack>
        </GridItem>
    </Grid>
}

export const List: FC<ListProps> = ({ docs, id, onSubmit }) => {
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
                    <Item onSubmit={onSubmit} doc={doc} key={doc.id} active={id === doc.id} />
                )
            })}
        </Grid>
    </VStack>
}
