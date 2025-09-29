import {FC, memo} from "react";
import {Badge, Button, Heading, Table, Text} from "@chakra-ui/react";
import {decimalToTimeString} from "@/components/TimeInput";
import {KMARRoadList, MambaRoadList} from "@/models";

type RecordsProps = {
    byVehicle?: {
        ids: string[];
        byID: Map<string, MambaRoadList | KMARRoadList>;
    }
    onOpen: (id: string) => void;
}

const Records: FC<RecordsProps> = ({ byVehicle, onOpen }) => {
    return <Table.Root>
        <Table.Header>
            <Table.Row>
                <Table.ColumnHeader>
                    <Heading size="sm">Період</Heading>
                </Table.ColumnHeader>
                <Table.ColumnHeader>
                    <Heading size="sm">Загальна тривалість</Heading>
                </Table.ColumnHeader>
                <Table.ColumnHeader colSpan={2}>
                    <Heading size="sm">Загальний розхід</Heading>
                </Table.ColumnHeader>
            </Table.Row>
        </Table.Header>
        <Table.Body>
            {byVehicle?.ids.map(id => {
                const record = byVehicle.byID.get(id);
                if (!record) return null;
                return (
                    <Table.Row key={id}>
                        <Table.Cell>
                            <Badge colorPalette="blue" size="lg">
                                <Text fontWeight="bold">
                                    {new Intl.DateTimeFormat('uk-UA', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        year: '2-digit'
                                    }).format(record.start)} — {new Intl.DateTimeFormat('uk-UA', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: '2-digit'
                                }).format(record.end)}
                                </Text>
                            </Badge>
                        </Table.Cell>
                        <Table.Cell>
                            <Text fontWeight="bold">{decimalToTimeString(record.currentHours)}</Text>
                        </Table.Cell>
                        <Table.Cell>
                            <Text fontWeight="bold">{record.consumedFuel}</Text>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                            <Button size="xs" onClick={() => {
                                onOpen(id)
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