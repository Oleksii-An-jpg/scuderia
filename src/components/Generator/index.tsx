'use client';
import {FC, PropsWithChildren, DragEvent, useCallback, useEffect, useRef} from 'react';
import {
    Button,
    Container,
    Field,
    Heading,
    Input,
    Textarea,
    VStack,
    Clipboard,
    InputGroup,
    IconButton, Grid, GridItem, Box, HStack, FileUpload, Icon, useFileUploadContext, Switch
} from "@chakra-ui/react";
import {Controller, FormProvider, useFieldArray, useForm, useFormContext} from "react-hook-form";
import { Tooltip } from '@/components/ui/tooltip'
import {generateSurveyRoute, parseTargets, Target, WaypointData} from "@/lib/survey";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import FullScreen from 'leaflet.fullscreen';
import {BiMenu, BiTrash, BiUpload} from "react-icons/bi";
import {
    DndContext, closestCenter, type DragEndEvent,
    type UniqueIdentifier
} from "@dnd-kit/core";
import {
    SortableContext, useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {CSS} from "@dnd-kit/utilities";
import {useBoolean} from "usehooks-ts";

const MAX_FILES = 1;

type DropzoneTextareaProps = {
    isDragging: boolean;
    onClear: () => void;
}

const ConditionalDropzone: FC<DropzoneTextareaProps> = ({ isDragging }) => {
    const fileUpload = useFileUploadContext();
    const { register, setValue } = useFormContext();
    const acceptedFiles = fileUpload.acceptedFiles;

    useEffect(() => {
        if (acceptedFiles.length >= MAX_FILES) {
            const reader = new FileReader();

            const [file] = acceptedFiles;
            reader.onload = (e) => {
                const fileContent = e.target?.result;
                setValue('input', fileContent);
            };
            reader.readAsText(file);
        }
    }, [acceptedFiles]);

    if (!isDragging || acceptedFiles.length >= MAX_FILES) {
        return <Textarea
            {...register('input', {
                required: true
            })}
            rows={10}
            placeholder="Enter target data or drop targets.map here..."
            fontFamily="mono"
        />
    }

    return (
        <FileUpload.Dropzone>
            <Icon size="sm" color="fg.muted">
                <BiUpload />
            </Icon>
            <FileUpload.DropzoneContent>
                <Box>Drag and drop files here</Box>
            </FileUpload.DropzoneContent>
        </FileUpload.Dropzone>
    )
}

const DropzoneTextarea: FC<DropzoneTextareaProps> = (props) => {
    return <FileUpload.Root alignItems="stretch" maxFiles={MAX_FILES}>
        <FileUpload.HiddenInput />
        <ConditionalDropzone {...props} />
        <FileUpload.ClearTrigger asChild>
            <Box>
                <Button
                    variant="outline"
                    colorPalette="red"
                    onClick={props.onClear}
                >Clear input</Button>
            </Box>
        </FileUpload.ClearTrigger>
    </FileUpload.Root>
}

const ClipboardIconButton = () => {
    return (
        <Clipboard.Trigger asChild alignSelf="start">
            <IconButton colorPalette="pink" variant="surface" size="xs" mt={2}>
                <Clipboard.Indicator />
            </IconButton>
        </Clipboard.Trigger>
    )
}

type Values = {
    contacts: Target[]
    input: string;
    speed: number;
    route: string;
    useBoxLeadins: boolean;
    waypoints: WaypointData[];
}

type SortableItemProps = PropsWithChildren<{
    id: UniqueIdentifier;
    index: number;
}>

const SortableItem: FC<SortableItemProps> = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Grid ref={setNodeRef} style={style} className="bg-white" templateColumns="subgrid" gridColumn="1 / -1">
            <GridItem alignSelf="center">
                <IconButton size="xs" variant="ghost" cursor="pointer" {...attributes} {...listeners}>
                    <BiMenu />
                </IconButton>
            </GridItem>
            {children}
        </Grid>
    );
}

const SurveyRouteGenerator: FC = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const methods = useForm<Values>({
        defaultValues: {
            speed: 2,
            waypoints: [],
            useBoxLeadins: false
        }
    });
    const { register, control, watch, setValue, handleSubmit, reset, formState: { isDirty, isValid } } = methods;
    const [input, route, waypoints] = watch(['input', 'route', 'waypoints']);
    const { fields, move, remove } = useFieldArray({
        control,
        name: 'contacts'
    });
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over?.id && active.id !== over?.id) {
            const oldIndex = fields.findIndex((field) => field.id === active.id);
            const newIndex = fields.findIndex((field) => field.id === over.id);
            move(oldIndex, newIndex); // Update react-hook-form's state
        }
    };
    useEffect(() => {
        if (input) {
            setValue('contacts', parseTargets(input))
        }
    }, [input]);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const map = L.map(mapRef.current).setView([60.585, 4.946], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        mapInstanceRef.current = map;

        map.addControl(
            // @ts-expect-error: unknown import
            new FullScreen({
                position: 'topleft'
            })
        );

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Update map when waypoints change
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !waypoints || waypoints.length === 0) return;

        // Clear existing layers
        map.eachLayer((layer) => {
            if (layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
                map.removeLayer(layer);
            }
        });

        // Draw route
        const coords: [number, number][] = waypoints
            .filter(wp => wp.latNum !== undefined && wp.lonNum !== undefined)
            .map(wp => [wp.latNum!, wp.lonNum!]);

        if (coords.length > 0) {
            // Draw track lines
            const trackCoords: [number, number][] = [];
            const turnCoords: [number, number][] = [];

            waypoints.forEach(wp => {
                if (wp.latNum !== undefined && wp.lonNum !== undefined) {
                    const coord: [number, number] = [wp.latNum, wp.lonNum];

                    if (wp.tag.includes('_') && !wp.tag.includes('t')) {
                        // Track waypoint
                        trackCoords.push(coord);
                    } else if (wp.tag.startsWith('t')) {
                        // Turn waypoint
                        turnCoords.push(coord);
                    }
                }
            });

            // Draw complete route
            L.polyline(coords, { color: '#116932', weight: 2, opacity: 0.6 }).addTo(map);

            // Highlight track lines
            for (let i = 0; i < waypoints.length - 1; i++) {
                const wp = waypoints[i];
                const nextWp = waypoints[i + 1];

                if (wp.latNum && wp.lonNum && nextWp.latNum && nextWp.lonNum) {
                    const isTrackLine = wp.tag.includes('_') && !wp.tag.includes('t') &&
                        nextWp.tag.startsWith('t');

                    if (isTrackLine) {
                        L.polyline(
                            [[wp.latNum, wp.lonNum], [nextWp.latNum, nextWp.lonNum]],
                            { color: '#116932', weight: 2, opacity: 0.6 }
                        ).addTo(map);
                    }
                }
            }

            // Add markers for key waypoints
            waypoints.forEach((wp, i) => {
                if (wp.latNum !== undefined && wp.lonNum !== undefined) {
                    if (wp.isLeadin || (wp.tag.includes('_') && !wp.tag.includes('t'))) {
                        L.circleMarker([wp.latNum, wp.lonNum], {
                            radius: 4,
                            fillColor: '#ef4444',
                            color: '#fff',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        }).bindPopup(wp.tag).addTo(map);
                    }
                }
            });

            // Fit map to bounds
            const bounds = L.latLngBounds(coords);
            map.fitBounds(bounds, { padding: [10, 10] });
        }
    }, [waypoints]);

    const { value, setTrue, setFalse } = useBoolean(false)

    const handleDragEnter = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setTrue();
        }
    }, []);

    const onClear = useCallback(() => {
        setFalse();
        reset({
            input: '',
            waypoints: [],
            contacts: []
        })
    }, [])

    return (
        <Container maxW="full">
            <VStack align="stretch">
                <Heading>Survey Pattern Route Generator</Heading>
                <FormProvider {...methods}>
                    <VStack gap={4} as="form" align="stretch" onSubmit={handleSubmit((data) => {
                        const { output, waypoints } = generateSurveyRoute(data.contacts, {
                            speed: data.speed,
                            useBoxLeadins: data.useBoxLeadins,
                        });
                        setValue('route', output.join('\n'));
                        setValue('waypoints', waypoints);
                    })}>
                        <Box onDragEnter={handleDragEnter} onDragLeave={() => {
                            setFalse()
                        }}>
                            <DropzoneTextarea onClear={onClear} isDragging={value} />
                        </Box>
                        <HStack alignItems="start" gap={2}>
                            <Grid className="w-1/2" gridTemplateColumns="repeat(7, auto)" gap={2}>
                                <Grid templateColumns="subgrid" gridColumn="1 / -1">
                                    <GridItem colStart={2}>
                                        Lat
                                    </GridItem>
                                    {['Lon', 'Tracks', 'Spacing', 'Bearing'].map(h => (
                                        <GridItem key={h}><Heading size="sm">{h}</Heading></GridItem>
                                    ))}
                                </Grid>
                                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={fields} strategy={verticalListSortingStrategy}>
                                        {fields.map((field, i) => (
                                            <SortableItem key={field.id} id={field.id} index={i}>
                                                <Field.Root><Input size="sm" type="number" step="any" disabled {...register(`contacts.${i}.lat`, {valueAsNumber: true})} /></Field.Root>
                                                <Field.Root><Input size="sm" type="number" step="any" disabled {...register(`contacts.${i}.lon`, {valueAsNumber: true})} /></Field.Root>
                                                {/*<Field.Root><Input size="sm" disabled {...register(`contacts.${i}.type`)} /></Field.Root>*/}
                                                {/*<Field.Root><Input size="sm" disabled {...register(`contacts.${i}.id`)} /></Field.Root>*/}
                                                <Field.Root><Input size="sm" type="number" step={1} {...register(`contacts.${i}.numTracks`, {valueAsNumber: true})} /></Field.Root>
                                                <Field.Root><Input size="sm" type="number" step={1} {...register(`contacts.${i}.spacing`, {valueAsNumber: true})} /></Field.Root>
                                                <Field.Root><Input size="sm" type="number" step={1} {...register(`contacts.${i}.bearing`, {valueAsNumber: true})} /></Field.Root>
                                                <GridItem>
                                                    <IconButton size="sm" colorPalette="red" variant="outline" onClick={() => {
                                                        remove(i);
                                                    }}><BiTrash /></IconButton>
                                                </GridItem>
                                            </SortableItem>
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            </Grid>
                            <Box className="h-full min-h-64 w-1/2" ref={mapRef} overflow="hidden" />
                        </HStack>

                        <HStack alignItems="center" gap={2}>
                            <Field.Root>
                                <Field.Label>Vehicle Speed (m/s)</Field.Label>
                                <Input type="number" {...register('speed', {valueAsNumber: true})} step="0.1" />
                            </Field.Root>
                            <Controller
                                name="useBoxLeadins"
                                control={control}
                                render={({ field }) => (
                                    <Field.Root>
                                        <Tooltip ids={{ trigger: 'id' }} content="We do our best trying to flatten sharp angles on a leadin waypoints so vehicle enters a survey track more or less stable">
                                            <Switch.Root
                                                ids={{ root: 'id' }}
                                                name={field.name}
                                                checked={field.value}
                                                onCheckedChange={({ checked }) => field.onChange(checked)}
                                            >
                                                <Switch.HiddenInput onBlur={field.onBlur} />
                                                <Switch.Control />
                                                <Switch.Label>
                                                    Use SMART lead-ins (experimental)
                                                </Switch.Label>
                                            </Switch.Root>
                                        </Tooltip>
                                    </Field.Root>
                                )}
                            />
                        </HStack>

                        <Button type="submit" colorPalette="pink" disabled={!isDirty || !isValid}>Generate Routes</Button>

                        <Clipboard.Root value={route}>
                            <Clipboard.Label>
                                <Heading size="md" mb={2}>Mission plan</Heading>
                            </Clipboard.Label>
                            <InputGroup endElement={<ClipboardIconButton />}>
                                <Clipboard.Input asChild>
                                    <Textarea variant="subtle" rows={20} fontFamily="mono" placeholder="Mission plan appears here..." value={route} readOnly />
                                </Clipboard.Input>
                            </InputGroup>
                        </Clipboard.Root>
                    </VStack>
                </FormProvider>
            </VStack>
        </Container>
    );
};

export default SurveyRouteGenerator;