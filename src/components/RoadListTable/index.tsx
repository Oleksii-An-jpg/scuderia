// src/components/RoadListTable/index.tsx

'use client';
import { FC, memo, useMemo, useState } from 'react';
import {
    Badge,
    Box,
    Button,
    EmptyState,
    Heading,
    HStack,
    IconButton,
    NativeSelect,
    Skeleton,
    Table,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    BiFirstPage,
    BiLastPage,
    BiLeftArrowAlt,
    BiRightArrowAlt,
    BiTrash,
    BiBowlHot
} from 'react-icons/bi';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    PaginationState,
    useReactTable,
} from '@tanstack/react-table';
import { CalculatedRoadList } from '@/types/roadList';
import { isCar, isBoat } from '@/types/vehicle';
import { useVehicleStore } from '@/lib/vehicleStore';
import { decimalToTimeString } from '@/lib/timeUtils';
import Clip from "@/components/Clip";

type Props = {
    loading: boolean;
    roadLists: CalculatedRoadList[];
    onOpen: (id: string) => void;
    onDelete: (id: string) => void;
}

const RoadListTable: FC<Props> = ({ loading, roadLists, onOpen, onDelete }) => {
    const vehicles = useVehicleStore.getState().vehicles
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const columns = useMemo<ColumnDef<CalculatedRoadList>[]>(
        () => [
            {
                header: 'Дорожній лист',
                columns: [
                    {
                        accessorKey: 'id',
                        header: 'Період',
                        cell: info => {
                            const model = info.row.original;
                            return (
                                <Badge colorPalette="blue" size="sm">
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
                            );
                        },
                        sortingFn: (rowA, rowB) => {
                            return rowA.original.start.getTime() - rowB.original.start.getTime();
                        }
                    },
                    {
                        accessorKey: 'start',
                        header: 'дата',
                        cell: info => {
                            const model = info.row.original;
                            return <Text fontWeight="bold">{new Intl.DateTimeFormat('uk-UA', {
                                month: '2-digit',
                                day: '2-digit',
                                year: '2-digit'
                            }).format(model.start)}</Text>;
                        },
                        sortingFn: (rowA, rowB) => {
                            return rowA.original.start.getTime() - rowB.original.start.getTime();
                        }
                    },
                    {
                        id: 'roadListID',
                        header: () => <Text className="whitespace-nowrap">№ д/л</Text>,
                        enableSorting: false,
                        accessorKey: 'roadListID',
                        cell: info => {
                            const model = info.row.original;
                            return <Text fontWeight="bold">{model.roadListID}</Text>;
                        },
                    },
                ],
            },
            {
                header: () => {
                    return (
                        <Text>
                            Пройдено (відпрацьовано)
                        </Text>
                    );
                },
                enableSorting: false,
                accessorKey: 'hours',
                columns: [
                    {
                        header: 'км',
                        cell: info => {
                            const model = info.row.original;
                            const vehicleConfig = vehicles.find(({ id }) => id === model.vehicle);
                            return (
                                <Text fontWeight="bold">
                                    {vehicleConfig && isCar(vehicleConfig) ? Math.round(model.hours) : null}
                                </Text>
                            );
                        },
                    },
                    {
                        header: 'год.',
                        cell: info => {
                            const model = info.row.original;
                            const vehicleConfig = vehicles.find(({ id }) => id === model.vehicle);
                            return (
                                <Text fontWeight="bold">
                                    {vehicleConfig && isBoat(vehicleConfig) ? decimalToTimeString(model.hours, true) : null}
                                </Text>
                            );
                        },
                    },
                ]
            },
            {
                id: 'odometerOrHours',
                header: (info) => {
                    const firstRow = info.table.getRowModel().rows[0]?.original;
                    if (!firstRow) return null;
                    const vehicleConfig = vehicles.find(({ id }) => id === info.table.getRowModel().rows[0]?.original.vehicle);
                    return (
                        <Text fontWeight="bold">
                            {vehicleConfig && (isBoat(vehicleConfig) ? 'Напрацювання двигунів (год:хв)' : 'Одометр (км)')}
                        </Text>
                    );
                },
                columns: [
                    {
                        accessorKey: 'startHours',
                        header: 'до',
                        enableSorting: false,
                        cell: info => {
                            const model = info.row.original;
                            const vehicleConfig = vehicles.find(({ id }) => id === model.vehicle);
                            if (!vehicleConfig) return null;

                            return (
                                <>{isBoat(vehicleConfig) ? <HStack>
                                    <Clip startElement="л" value={typeof model.startHours === 'object' ? decimalToTimeString(model.startHours.left) : undefined} />
                                    <Clip startElement="п" value={typeof model.startHours === 'object' ? decimalToTimeString(model.startHours.right) : undefined} />
                                </HStack> : <Clip value={typeof model.startHours === 'number' ? String(Math.round(model.startHours)) : undefined} />}</>
                            );
                        }
                    },
                    {
                        accessorKey: 'cumulativeHours',
                        header: 'після',
                        enableSorting: false,
                        cell: info => {
                            const model = info.row.original;
                            const vehicleConfig = vehicles.find(({ id }) => id === model.vehicle);
                            if (!vehicleConfig) return null;

                            return (
                                <>{isBoat(vehicleConfig) ? <HStack>
                                    <Clip startElement="л" value={typeof model.cumulativeHours === 'object' ? decimalToTimeString(model.cumulativeHours.left) : undefined} />
                                    <Clip startElement="п" value={typeof model.cumulativeHours === 'object' ? decimalToTimeString(model.cumulativeHours.right) : undefined} />
                                </HStack> : <Clip value={typeof model.cumulativeHours === 'number' ? String(Math.round(model.cumulativeHours)) : undefined} />}</>
                            );
                        }
                    }
                ]
            },
            {
                id: 'fuelMovement',
                header: () => <Text fontWeight="bold" textAlign="center">Рух пального</Text>,
                columns: [
                    {
                        accessorKey: 'startFuel',
                        header: 'до',
                        enableSorting: false,
                        cell: info => {
                            const model = info.row.original;
                            return <Text fontWeight="bold">{Math.round(model.startFuel)}</Text>;
                        },
                    },
                    {
                        accessorKey: 'cumulativeReceivedFuel',
                        header: 'отримано',
                        enableSorting: false,
                        cell: info => {
                            const model = info.row.original;
                            return <Text fontWeight="bold">{Math.round(model.cumulativeReceivedFuel)}</Text>;
                        }
                    },
                    {
                        accessorKey: 'fuel',
                        header: 'витрата',
                        enableSorting: false,
                        cell: info => {
                            const model = info.row.original;
                            return <Text fontWeight="bold">{Math.round(model.fuel)}</Text>;
                        }
                    },
                    {
                        accessorKey: 'cumulativeFuel',
                        header: 'після',
                        enableSorting: false,
                        cell: info => {
                            const model = info.row.original;
                            return <Text fontWeight="bold">{Math.round(model.cumulativeFuel)}</Text>;
                        }
                    }
                ],
            },
            {
                id: 'actions',
                cell: info => {
                    const model = info.row.original;
                    return (
                        <HStack justifyContent="flex-end">
                            <Button size="xs" onClick={() => onOpen(model.id!)}>
                                Переглянути
                            </Button>
                            <IconButton
                                onClick={() => onDelete(model.id!)}
                                size="xs"
                                colorPalette="red"
                                variant="outline"
                                aria-label="Видалити"
                            >
                                <BiTrash />
                            </IconButton>
                        </HStack>
                    );
                }
            }
        ],
        [vehicles]
    );

    const table = useReactTable({
        columns,
        data: roadLists,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        state: { pagination },
        initialState: {
            sorting: [{ id: 'start', desc: true }],
        },
    });

    return (
        <Table.Root showColumnBorder variant="outline" size="sm">
            <Table.Header>
                {table.getHeaderGroups().map(headerGroup => (
                    <Table.Row key={headerGroup.id}>
                        {headerGroup.headers.map(header => {
                            return (
                                <Table.ColumnHeader key={header.id} colSpan={header.colSpan}>
                                    {header.isPlaceholder ? null : <Heading
                                        className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                                        onClick={header.column.getToggleSortingHandler()}
                                        size="sm"
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {{
                                            asc: ' 🔼',
                                            desc: ' 🔽',
                                        }[header.column.getIsSorted() as string] ?? null}
                                    </Heading>}
                                </Table.ColumnHeader>
                            )
                        })}
                    </Table.Row>
                ))}
            </Table.Header>

            <Table.Body>
                {loading ? (
                    Array.from({ length: table.getAllLeafColumns().length }).map((_, index) => (
                        <Table.Row key={index}>
                            {columns.map((_, colIndex) => (
                                <Table.Cell key={colIndex}>
                                    <Skeleton height="20px" />
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    ))
                ) : roadLists.length === 0 ? (
                    <Table.Row>
                        <Table.Cell colSpan={table.getAllLeafColumns().length}>
                            <EmptyState.Root>
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
                    </Table.Row>
                ) : (
                    table.getRowModel().rows.map(row => (
                        <Table.Row key={row.id}>
                            {row.getVisibleCells().map(cell => (
                                <Table.Cell key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    ))
                )}
            </Table.Body>

            <Table.Footer>
                <Table.Row>
                    <Table.Cell colSpan={table.getAllLeafColumns().length}>
                        <VStack align="stretch">
                            <HStack justifyContent="space-between">
                                <HStack>
                                    <IconButton
                                        size="xs"
                                        onClick={() => table.firstPage()}
                                        disabled={!table.getCanPreviousPage()}
                                    >
                                        <BiFirstPage />
                                    </IconButton>
                                    <IconButton
                                        size="xs"
                                        onClick={() => table.previousPage()}
                                        disabled={!table.getCanPreviousPage()}
                                    >
                                        <BiLeftArrowAlt />
                                    </IconButton>
                                    <IconButton
                                        size="xs"
                                        onClick={() => table.nextPage()}
                                        disabled={!table.getCanNextPage()}
                                    >
                                        <BiRightArrowAlt />
                                    </IconButton>
                                    <IconButton
                                        size="xs"
                                        onClick={() => table.lastPage()}
                                        disabled={!table.getCanNextPage()}
                                    >
                                        <BiLastPage />
                                    </IconButton>
                                    <Text>Сторінка</Text>
                                    <Text fontWeight="bold">
                                        {table.getState().pagination.pageIndex + 1} із{' '}
                                        {table.getPageCount()}
                                    </Text>
                                </HStack>
                                <Box>
                                    <NativeSelect.Root size="xs">
                                        <NativeSelect.Field
                                            value={table.getState().pagination.pageSize}
                                            onChange={e => table.setPageSize(Number(e.target.value))}
                                        >
                                            {[10, 20, 30, 40, 50].map(pageSize => (
                                                <option key={pageSize} value={pageSize}>
                                                    Показати {pageSize}
                                                </option>
                                            ))}
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                </Box>
                            </HStack>
                            <Box>
                                Показано {table.getRowModel().rows.length} з{' '}
                                {table.getRowCount()} записів
                            </Box>
                        </VStack>
                    </Table.Cell>
                </Table.Row>
            </Table.Footer>
        </Table.Root>
    );
};

export default memo(RoadListTable);