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
    VStack
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
import { isBoat } from '@/types/vehicle';
import { decimalToTimeString } from '@/lib/timeUtils';

type Props = {
    loading: boolean;
    roadLists: CalculatedRoadList[];
    onOpen: (id: string) => void;
    onDelete: (id: string) => void;
}

const RoadListTable: FC<Props> = ({ loading, roadLists, onOpen, onDelete }) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const columns = useMemo<ColumnDef<CalculatedRoadList>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'Період',
                cell: info => {
                    const model = info.row.original;
                    return (
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
                    );
                },
                sortingFn: (rowA, rowB) => {
                    return rowA.original.start.getTime() - rowB.original.start.getTime();
                }
            },
            {
                header: 'Дорожній лист',
                accessorKey: 'roadListID',
                cell: info => {
                    const model = info.row.original;
                    return <Text fontWeight="bold">{model.roadListID}</Text>;
                },
            },
            {
                header: info => {
                    const vehicle = info.table.getRowModel().rows[0]?.original.vehicle;
                    return (
                        <Text>
                            {vehicle && (isBoat(vehicle) ? 'Загальна тривалість' : 'Загальний пробіг (км)')}
                        </Text>
                    );
                },
                accessorKey: 'hours',
                cell: info => {
                    const model = info.row.original;
                    return (
                        <Text fontWeight="bold">
                            {isBoat(model.vehicle) ? decimalToTimeString(model.hours) : Math.round(model.hours)}
                        </Text>
                    );
                },
            },
            {
                header: 'Загальний розхід',
                accessorKey: 'fuel',
                cell: info => {
                    const model = info.row.original;
                    return <Text fontWeight="bold">{Math.round(model.fuel)}</Text>;
                },
            },
            {
                header: 'Залишок на кінець зміни',
                accessorKey: 'cumulativeFuel',
                cell: info => {
                    const model = info.row.original;
                    return <Text fontWeight="bold">{Math.round(model.cumulativeFuel)}</Text>;
                }
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
        []
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
            sorting: [{ id: 'id', desc: true }],
        },
    });

    return (
        <Table.Root>
            <Table.Header>
                {table.getHeaderGroups().map(headerGroup => (
                    <Table.Row key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <Table.ColumnHeader key={header.id} colSpan={header.colSpan}>
                                <Heading
                                    className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                                    onClick={header.column.getToggleSortingHandler()}
                                    size="sm"
                                >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                    {{
                                        asc: ' 🔼',
                                        desc: ' 🔽',
                                    }[header.column.getIsSorted() as string] ?? null}
                                </Heading>
                            </Table.ColumnHeader>
                        ))}
                    </Table.Row>
                ))}
            </Table.Header>

            <Table.Body>
                {loading ? (
                    Array.from({ length: 10 }).map((_, index) => (
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
                        <Table.Cell colSpan={columns.length}>
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
                    <Table.Cell colSpan={columns.length}>
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