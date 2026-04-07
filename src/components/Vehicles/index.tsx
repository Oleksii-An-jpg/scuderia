'use client';

import {FC, Fragment, useEffect, useMemo} from "react";
import {
    ColumnDef, flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {SerializableVehicle, VehicleConfig, VehicleMode} from "@/types/vehicle";
import {
    Heading,
    Icon,
    Table,
    Text,
    DataList,
    VStack,
    Grid,
    EmptyState, HStack, Button, Portal, Dialog, CloseButton, Field, Input, NativeSelect, GridItem, IconButton, Checkbox,
    Box
} from "@chakra-ui/react";
import {BiBowlHot, BiHappy, BiPlus, BiSad, BiTrash} from "react-icons/bi";
import {useBoolean} from "usehooks-ts";
import {useForm, useFieldArray, Controller} from "react-hook-form";
import {useRouter} from "next/navigation";
import {SerializableRoadList} from "@/types/roadList";

type VehiclesProps = {
    vehicles: SerializableVehicle[];
    roadLists: SerializableRoadList[];
}

type Values = Omit<VehicleConfig, 'modes' | 'createdAt' | 'updatedAt'> & {
    modes: Partial<VehicleMode>[]
}

type VehicleWithCount = SerializableVehicle & {
    count: number
}

const Vehicles: FC<VehiclesProps> = (props) => {
    const { value, setValue: setDialogValue, setTrue } = useBoolean();
    const { handleSubmit, setValue, watch, formState: { isSubmitting, isValid }, control, register, reset } = useForm<Values>({
        defaultValues: {
            type: 'car',
            active: true
        }
    });
    const vehicles = useMemo(() => {
        return props.vehicles.map(vehicle => ({
            ...vehicle,
            count: props.roadLists.filter(rl => rl.vehicle === vehicle.id).length
        }))
    }, [props.vehicles]);
    const { fields, append, remove } = useFieldArray({
        control, // control props comes from useForm (optional: if you are using FormProvider)
        name: "modes", // unique name for your Field Array
    });
    const [id, type] = watch(['id', 'type']);
    useEffect(() => {
        setValue('unit', type === 'car' ? 'km' : 'hours');
    }, [type]);
    const columns = useMemo<ColumnDef<VehicleWithCount>[]>(() => [
        {
            accessorKey: 'id',
            header: 'Ідентифікатор',
        },
        {
            accessorKey: 'name',
            header: 'Назва',
        },
        {
            accessorKey: 'type',
            header: 'Тип транспорту',
            cell: info => {
                return <Text>{info.getValue() === 'car' ? 'Автомобіль' : 'Катер'}</Text>
            }
        },
        {
            accessorKey: 'unit',
            header: 'Одиниця напрацювання',
            cell: info => {
                return <Text>{info.getValue() === 'km' ? 'км' : 'год'}</Text>
            }
        },
        {
            accessorKey: 'modes',
            header: 'Швидкісні режими',
            cell: (info) => {
                const modes = info.getValue() as SerializableVehicle['modes'];

                return <DataList.Root variant="bold" size="sm" orientation="horizontal">
                    {modes.map((mode) => (
                        <DataList.Item key={mode.label}>
                            <DataList.ItemLabel>{mode.label}</DataList.ItemLabel>
                            <DataList.ItemValue><Text as="b">{mode.rate}</Text></DataList.ItemValue>
                        </DataList.Item>
                    ))}
                </DataList.Root>
            }
        },
        {
            header: 'Активний',
            accessorKey: 'active',
            cell: info => {
                const active = info.getValue();
                return <Icon size="lg" color={active? 'green.500' : 'red.500'}>
                    {active ? <BiHappy /> : <BiSad />}
                </Icon>
            }
        },
        {
            id: 'createdAt',
            header: 'Створено',
            accessorFn: (vehicle) => {
                return new Intl.DateTimeFormat('uk-UA', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                }).format(new Date(vehicle.createdAt))
            }
        },
        {
            id: 'updatedAt',
            header: 'Оновлено',
            accessorFn: (vehicle) => {
                return new Intl.DateTimeFormat('uk-UA', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                }).format(new Date(vehicle.updatedAt))
            }
        },
        {
            accessorKey: 'count',
            header: 'Дорожних листів'
        },
        {
            accessorKey: 'id',
            header: 'Дії',
            id: 'actions',
            enableSorting: false,
            cell: info => {
                return <HStack>
                    <Button variant="outline" size="xs" onClick={() => {
                        const vehicle = vehicles.find(({ id }) => id === info.getValue())

                        if (vehicle) {
                            reset(vehicle);
                            setTrue();
                        }
                    }}>
                        Переглянути
                    </Button>
                </HStack>
            }
        }
    ], []);
    const router = useRouter();
    const isEditing = useMemo(() => {
        return !!vehicles.find((vehicle) => vehicle.id === id);
    }, [id, vehicles]);

    const table = useReactTable({
        columns,
        data: vehicles,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        // onPaginationChange: setPagination,
        // state: { pagination },
        // initialState: {
        //     sorting: [{ id: 'start', desc: true }],
        // },
    });

    return (
        <>
            <Table.Root showColumnBorder variant="outline">
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
                    {vehicles.length === 0 ? <Table.Row>
                        <Table.Cell colSpan={table.getAllLeafColumns().length}>
                            <EmptyState.Root>
                                <EmptyState.Content>
                                    <EmptyState.Indicator>
                                        <BiBowlHot />
                                    </EmptyState.Indicator>
                                    <VStack textAlign="center">
                                        <EmptyState.Title>Транспорті засоби відсутні</EmptyState.Title>
                                        <EmptyState.Description>
                                            Додавайте транспортні, щоб вони відображалися тут.
                                        </EmptyState.Description>
                                    </VStack>
                                </EmptyState.Content>
                            </EmptyState.Root>
                        </Table.Cell>
                    </Table.Row> : table.getRowModel().rows.map(row => (
                        <Table.Row key={row.id}>
                            {row.getVisibleCells().map(cell => (
                                <Table.Cell key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
                <Table.Footer>
                    <Table.Row>
                        <Table.Cell colSpan={table.getAllLeafColumns().length}>
                            <HStack>
                                <Button onClick={setTrue} variant="outline" size="sm">Додати транспортний засіб</Button>
                            </HStack>
                        </Table.Cell>
                    </Table.Row>
                </Table.Footer>
            </Table.Root>
            <Dialog.Root
                scrollBehavior="inside"
                size="cover"
                open={value}
                onOpenChange={(e) => setDialogValue(e.open)}
            >
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxH="100%">
                            <Dialog.Header>
                                <Dialog.Title>
                                    {isEditing ? 'Редагувати' : 'Додати транспортний засіб'}
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body css={{ "--field-label-width": '18em'}}>
                                <form id="upsert" onSubmit={handleSubmit(async (data) => {
                                    await fetch('/admin/api/vehicles', {
                                        method: 'POST',
                                        body: JSON.stringify(data),
                                    });

                                    reset(data);

                                    router.refresh();

                                    setDialogValue(false);
                                })}>
                                    <VStack align="stretch">
                                        <Field.Root orientation="horizontal" required>
                                            <Field.Label>
                                                Ідентифікатор (унікальний)
                                                <Field.RequiredIndicator />
                                            </Field.Label>
                                            <Input
                                                autoComplete="off"
                                                disabled={isEditing}
                                                {...register('id', {
                                                    required: true
                                                })}
                                            />
                                        </Field.Root>
                                        <Field.Root orientation="horizontal" required>
                                            <Field.Label>
                                                Назва (може дублюватись)
                                                <Field.RequiredIndicator />
                                            </Field.Label>
                                            <Input
                                                autoComplete="off"
                                                {...register('name', {
                                                    required: true
                                                })}
                                            />
                                        </Field.Root>
                                        <Field.Root orientation="horizontal" required>
                                            <Field.Label>
                                                Тип
                                                <Field.RequiredIndicator />
                                            </Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field {...register('type', {
                                                    required: true
                                                })}>
                                                    <option value="car">Автомобіль</option>
                                                    <option value="boat">Катер</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                        <Field.Root disabled orientation="horizontal" required>
                                            <Field.Label>
                                                Одиниця напрацювання
                                                <Field.RequiredIndicator />
                                            </Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field {...register('unit', {
                                                    required: true
                                                })}>
                                                    <option value="km">км</option>
                                                    <option value="hours">год</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                        <Field.Root orientation="horizontal" required>
                                            <Field.Label>
                                                Тип пального
                                                <Field.RequiredIndicator />
                                            </Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field {...register('fuel', {
                                                    required: true
                                                })}>
                                                    <option value="gasoline">Бензин</option>
                                                    <option value="diesel">Дизель</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                        <Field.Root orientation="horizontal" required>
                                            <Field.Label alignSelf="start">
                                                Швидкісні режими
                                                <Field.RequiredIndicator />
                                            </Field.Label>
                                            <input
                                                type="hidden"
                                                {...register('modes', {
                                                    validate: (value) => value.length >= 1
                                                })}
                                            />
                                            <Grid flex={1} templateColumns="1fr 1fr auto" gap={2}>
                                                {fields.map((field, index) => (
                                                    <Fragment key={field.id}>
                                                        <GridItem>
                                                            <input type="hidden" {...register(`modes.${index}.id`, {
                                                                value: field.id,
                                                            })} />
                                                            <Field.Root required>
                                                                <Input
                                                                    autoComplete="off"
                                                                    placeholder="Назва"
                                                                    {...register(`modes.${index}.label`, {
                                                                        required: true
                                                                    })}
                                                                />
                                                            </Field.Root>
                                                        </GridItem>
                                                        <GridItem>
                                                            <Field.Root required>
                                                                <Input
                                                                    autoComplete="off"
                                                                    type="number"
                                                                    step={0.00001}
                                                                    placeholder="Коефіцієнт витрати пального"
                                                                    {...register(`modes.${index}.rate`, {
                                                                        valueAsNumber: true,
                                                                        required: true
                                                                    })}
                                                                />
                                                            </Field.Root>
                                                        </GridItem>
                                                        <GridItem>
                                                            <IconButton variant="outline" colorPalette="red" onClick={() => remove(index)}>
                                                                <BiTrash />
                                                            </IconButton>
                                                        </GridItem>
                                                    </Fragment>
                                                ))}
                                                <GridItem colSpan={3}>
                                                    <Button variant="outline" w="full" onClick={() => {
                                                        append({
                                                            order: fields.length
                                                        })
                                                    }}>
                                                        <BiPlus /> Додати режим
                                                    </Button>
                                                </GridItem>
                                            </Grid>
                                        </Field.Root>
                                        <Controller
                                            control={control}
                                            name="active"
                                            render={({ field }) => (
                                                <Field.Root orientation="horizontal">
                                                    <Field.Label>
                                                        Активний
                                                    </Field.Label>
                                                    <Box flex={1}>
                                                        <Checkbox.Root
                                                            checked={field.value}
                                                            onCheckedChange={({ checked }) => field.onChange(checked)}
                                                        >
                                                            <Checkbox.HiddenInput />
                                                            <Checkbox.Control />
                                                        </Checkbox.Root>
                                                    </Box>
                                                </Field.Root>
                                            )}
                                        />
                                    </VStack>
                                </form>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">Скасувати</Button>
                                </Dialog.ActionTrigger>
                                <Button disabled={!isValid} loading={isSubmitting} form="upsert" type="submit">
                                    Зберегти
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger asChild>
                                <CloseButton size="sm" />
                            </Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </>
    )
}

export default Vehicles;