'use client';
import {FC, useMemo, useState} from "react";
import {UserInfo} from "@firebase/auth";
import {
    ColumnDef, flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel, PaginationState,
    useReactTable
} from "@tanstack/react-table";
import {
    Heading,
    Table,
    Select,
    Portal,
    createListCollection,
    HStack,
    Input,
    IconButton
} from "@chakra-ui/react";
import {UserRecord} from "firebase-admin/auth";
import {Controller, useForm} from "react-hook-form";
import {BiCheck} from "react-icons/bi";

type User = Omit<UserInfo, 'providerId'> & {
    customClaims: UserRecord['customClaims']
};

type CustomClaims = {
    role: string;
    nickname: string;
}

type UserProps = {
    users: User[]
}

const EditRole: FC<CustomClaims & {
    uid: string
}> = ({ uid, ...rest }) => {
    const roles = useMemo(() => createListCollection({
        items: [
            { label: "Адмін", value: "admin" },
            { label: "Редактор", value: "editor" },
            { label: "Глядач", value: "viewer" },
            { label: "Гість", value: "guest" },
        ],
    }), []);
    const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
        defaultValues: {
            uid,
            ...rest
        }
    });
    return <Controller
        control={control}
        name="role"
        render={({ field }) => (
            <Select.Root
                disabled={isSubmitting}
                name={field.name}
                value={[field.value]}
                onValueChange={({ value }) => {
                    field.onChange(...value);
                    handleSubmit(async (data) => {
                        await fetch('/admin/api/users', {
                            method: 'PATCH',
                            body: JSON.stringify(data)
                        });

                        reset(data);
                    })();
                }}
                onInteractOutside={() => field.onBlur()}
                collection={roles}
            >
                <Select.HiddenSelect />
                <Select.Control>
                    <Select.Trigger>
                        <Select.ValueText placeholder="Оберіть роль" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                        <Select.Indicator />
                    </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                    <Select.Positioner>
                        <Select.Content>
                            {roles.items.map((role) => (
                                <Select.Item item={role} key={role.value}>
                                    {role.label}
                                    <Select.ItemIndicator />
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Positioner>
                </Portal>
            </Select.Root>
        )}
    />
}

const EditNickname: FC<CustomClaims & {
    uid: string
}> = ({ uid, ...rest }) => {
    const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm({
        defaultValues: {
            uid,
            ...rest
        }
    });

    return <HStack>
        <Input autoComplete="off" {...register('nickname')} />
        <IconButton disabled={!isDirty} variant="subtle" colorPalette="gray" loading={isSubmitting} onClick={handleSubmit(async (data) => {
            await fetch('/admin/api/users', {
                method: 'PATCH',
                body: JSON.stringify(data)
            });

            reset(data);
        })}><BiCheck /></IconButton>
    </HStack>
}

const Users: FC<UserProps> = ({ users }) => {
    const columns = useMemo<ColumnDef<User>[]>(
        () => [
            {
                id: 'contacts',
                header: 'Контакти',
                accessorFn: (originalRow) => [originalRow.displayName, originalRow.phoneNumber, originalRow.email].filter(Boolean).join(', ')
            },
            {
                id: 'nickname',
                header: 'Позивний',
                accessorKey: 'customClaims',
                cell: info => {
                    return <EditNickname {...info.getValue() as CustomClaims} uid={info.row.original.uid} />
                }
            },
            {
                id: 'role',
                header: 'Роль',
                accessorKey: 'customClaims',
                cell: info => {

                    return <EditRole {...info.getValue() as CustomClaims} uid={info.row.original.uid} />
                }
            }
        ],
        [users]
    );
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const table = useReactTable({
        columns,
        data: users,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        state: { pagination },
    });
    return <Table.Root showColumnBorder variant="outline" size="sm">
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
            {table.getRowModel().rows.map(row => (
                <Table.Row key={row.id}>
                    {row.getVisibleCells().map(cell => (
                        <Table.Cell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                    ))}
                </Table.Row>
            ))}
        </Table.Body>
    </Table.Root>
}

export default Users;