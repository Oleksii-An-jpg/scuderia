import {FC, memo} from "react";
import {Badge, Button, EmptyState, Heading, Skeleton, Table, Text, VStack} from "@chakra-ui/react";
import {decimalToTimeString} from "@/components/TimeInput";
import {KMARRoadListUIModel, MambaRoadListUIModel} from "@/models/mamba";
import "react-datepicker/dist/react-datepicker.css";
import {BiBowlHot} from "react-icons/bi";

type RecordsProps = {
    loading: boolean;
    models?: (MambaRoadListUIModel | KMARRoadListUIModel)[];
    onOpen: (id: string) => void;
}

const Records: FC<RecordsProps> = ({ models, onOpen, loading }) => {
    return <Table.Root>
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
                <Table.ColumnHeader colSpan={2}>
                    <Heading size="sm">Залишок на кінець зміни</Heading>
                </Table.ColumnHeader>
            </Table.Row>
        </Table.Header>
        <Table.Body>
            {loading || !models ? Array.from({ length: 10 }).map((_, index) => (
                <Table.Row key={index}>
                    <Table.Cell>
                        <Skeleton height="20px" />
                    </Table.Cell>
                    <Table.Cell>
                        <Skeleton height="20px" />
                    </Table.Cell>
                    <Table.Cell>
                        <Skeleton height="20px" />
                    </Table.Cell>
                    <Table.Cell>
                        <Skeleton height="20px" />
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                        <Skeleton height="20px" />
                    </Table.Cell>
                </Table.Row>
            )) : models.length === 0 ? <Table.Row>
                <Table.Cell colSpan={5}>
                    <EmptyState.Root >
                        <EmptyState.Content>
                            <EmptyState.Indicator>
                                <BiBowlHot />
                            </EmptyState.Indicator>
                            <VStack textAlign="center">
                                <EmptyState.Title>Дорожні листи відсутні</EmptyState.Title>
                                <EmptyState.Description>
                                    Додавайте дорожні листи, щоб вони відображалися тут.
                                </EmptyState.Description>
                            </VStack>
                        </EmptyState.Content>
                    </EmptyState.Root>
                </Table.Cell>
            </Table.Row> : models.map((model, index) => {
                return (
                    <Table.Row key={index}>
                        <Table.Cell>
                            <Badge colorPalette="blue" size="lg">
                                <Text fontWeight="bold">
                                    {new Intl.DateTimeFormat('uk-UA', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        year: '2-digit'
                                    }).format(model.start)} — {new Intl.DateTimeFormat('uk-UA', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: '2-digit'
                                }).format(model.end)}
                                </Text>
                            </Badge>
                        </Table.Cell>
                        <Table.Cell>
                            <Text fontWeight="bold">{decimalToTimeString(model.hours)}</Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text fontWeight="bold">{model.fuel}</Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text fontWeight="bold">{model.cumulativeFuel}</Text>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                            <Button size="xs" onClick={() => {
                                onOpen(model.id)
                            }}>
                                Переглянути
                            </Button>
                        </Table.Cell>
                    </Table.Row>
                )
            })}
        </Table.Body>
    </Table.Root>
}

export default memo(Records);