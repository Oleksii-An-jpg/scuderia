import {FC, memo, useMemo, useState} from "react";
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
} from "@chakra-ui/react";
import {decimalToTimeString} from "@/components/TimeInput";
import {F250RoadListUIModel, KMARRoadListUIModel, MambaRoadListUIModel, Vehicle} from "@/models/mamba";
import "react-datepicker/dist/react-datepicker.css";
import {BiBowlHot, BiFirstPage, BiLastPage, BiLeftArrowAlt, BiRightArrowAlt, BiTrash} from "react-icons/bi";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    PaginationState,
    useReactTable,
} from '@tanstack/react-table'

type RecordsProps = {
    loading: boolean;
    models?: (MambaRoadListUIModel | KMARRoadListUIModel | F250RoadListUIModel)[];
    onOpen: (id: string) => void;
    onDelete: (id: string) => void
}

const Records: FC<RecordsProps> = ({ models = [], onOpen, loading, onDelete }) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const columns = useMemo<ColumnDef<MambaRoadListUIModel | KMARRoadListUIModel | F250RoadListUIModel>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'Період',
                cell: info => {
                    const model = info.row.original;
                    return <Badge colorPalette="blue" size="lg">
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
                },
                sortingFn: (rowA, rowB) => {
                    const a = rowA.original as MambaRoadListUIModel | KMARRoadListUIModel;
                    const b = rowB.original as MambaRoadListUIModel | KMARRoadListUIModel;

                    const aTime = a.start.getTime();
                    const bTime = b.start.getTime();

                    if (aTime > bTime) {
                        return 1;
                    }
                    if (aTime < bTime) {
                        return -1;
                    }
                    return 0;
                }
            },
            {
                header: 'Дорожній лист',
                accessorKey: 'roadListID',
                cell: info => {
                    const model = info.row.original;
                    return <Text fontWeight="bold">{model.roadListID}</Text>
                },
            },
            {
                header: info => {
                    const vehicle = info.table.getRowModel().rows[0]?.original.vehicle;
                    return <Text>{(vehicle === Vehicle.F250 || vehicle === Vehicle.MASTER) ? 'Загальний пробіг (км)' : 'Загальна тривалість'}</Text>
                },
                accessorKey: 'hours',
                cell: info => {
                    const model = info.row.original;

                    return <Text fontWeight="bold">{(model.vehicle === Vehicle.F250 || model.vehicle === Vehicle.MASTER) ? model.hours : decimalToTimeString(model.hours)}</Text>
                },
            },
            {
                header: 'Загальний розхід',
                accessorKey: 'fuel',
                cell: info => {
                    const model = info.row.original;
                    return <Text fontWeight="bold">{model.fuel}</Text>
                },
            },
            {
                header: 'Залишок на кінець зміни',
                accessorKey: 'cumulativeFuel',
                cell: info => {
                    const model = info.row.original;
                    return <Text fontWeight="bold">{model.cumulativeFuel}</Text>
                }
            },
            {
                id: 'actions',
                cell: info => {
                    const model = info.row.original;
                    return <HStack justifyContent="flex-end">
                        <Button size="xs" onClick={() => {
                            onOpen(model.id)
                        }}>
                            Переглянути
                        </Button>
                        <IconButton
                            onClick={() => {
                                onDelete(model.id)
                            }}
                            size="xs"
                            colorPalette="red"
                            variant="outline"
                            aria-label="Видалити"
                        >
                            <BiTrash />
                        </IconButton>
                    </HStack>
                }
            }
        ],
        []
    )

    const table = useReactTable({
        columns,
        data: models,
        debugTable: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        //no need to pass pageCount or rowCount with client-side pagination as it is calculated automatically
        state: {
            pagination,
        },
        // autoResetPageIndex: false, // turn off page index reset when sorting or filtering
    })
    return <Table.Root>
        <Table.Header>
            {table.getHeaderGroups().map(headerGroup => (
                <Table.Row key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                        return (
                            <Table.ColumnHeader key={header.id} colSpan={header.colSpan}>
                                <Heading {...{
                                    className: header.column.getCanSort()
                                        ? 'cursor-pointer select-none'
                                        : '',
                                    onClick: header.column.getToggleSortingHandler(),
                                }} size="sm">
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                    {{
                                        asc: ' 🔼',
                                        desc: ' 🔽',
                                    }[header.column.getIsSorted() as string] ?? null}
                                </Heading>
                            </Table.ColumnHeader>
                        )
                    })}
                </Table.Row>
            ))}
        </Table.Header>
        <Table.Body>
            {loading ? Array.from({ length: 10 }).map((_, index) => (
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
            </Table.Row> : table.getRowModel().rows.map(row => {
                return (
                    <Table.Row key={row.id}>
                        {row.getVisibleCells().map(cell => {
                            return (
                                <Table.Cell key={cell.id}>
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </Table.Cell>
                            )
                        })}
                    </Table.Row>
                )
            })}
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
                                <Text fontWeight="bold" className="whitespace-nowrap">
                                    {table.getState().pagination.pageIndex + 1} із{' '}
                                    {table.getPageCount().toLocaleString()}
                                </Text>
                            </HStack>
                            <Box>
                                <NativeSelect.Root size="xs">
                                    <NativeSelect.Field value={table.getState().pagination.pageSize}
                                                        onChange={e => {
                                                            table.setPageSize(Number(e.target.value))
                                                        }}>
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
                            Показано {table.getRowModel().rows.length.toLocaleString()} з{' '}
                            {table.getRowCount().toLocaleString()} записів
                        </Box>
                    </VStack>
                </Table.Cell>
            </Table.Row>
        </Table.Footer>
    </Table.Root>
}

export default memo(Records);