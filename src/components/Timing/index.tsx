import {FC, useMemo} from "react";
import {Dialog, IconButton, Input, Portal, Table, VStack} from "@chakra-ui/react";
import {BiSolidTimer} from "react-icons/bi";
import {CalculatedItinerary, RoadList} from "@/types/roadList";
import {getModes, VehicleConfig, VehicleMode} from "@/types/vehicle";
import {useFormContext} from "react-hook-form";

type TimingProps = {
    calculated?: CalculatedItinerary;
    vehicleConfig: VehicleConfig
    index: number
}

type TimeSegment = {
    modeId: string;
    modeName: string;
    duration: number; // in hours
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
}

function formatTime(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addHours(timeStr: string, hours: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + Math.round(hours * 60);
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function distributeTimeSegments(
    modeData: Record<string, number>,
    modes: VehicleMode[],
    startTime: string,
    itineraryDate?: Date
): TimeSegment[] {
    const sortedModes = [...modes].sort((a, b) => a.order - b.order);
    const activeModes = sortedModes.filter(m => (modeData[m.id] || 0) > 0);
    if (activeModes.length === 0) return [];

    const dateStr = itineraryDate ? itineraryDate.toISOString().split('T')[0] : "fixed";
    const remainingTime = { ...modeData };
    const segments: TimeSegment[] = [];
    let currentTime = startTime;

    const pushSegment = (mode: VehicleMode, duration: number) => {
        if (duration <= 0.001) return;
        const lastSegment = segments[segments.length - 1];

        if (lastSegment && lastSegment.modeId === mode.id) {
            lastSegment.duration += duration;
            lastSegment.endTime = addHours(lastSegment.startTime, lastSegment.duration);
            currentTime = lastSegment.endTime;
        } else {
            const endTime = addHours(currentTime, duration);
            segments.push({
                modeId: mode.id,
                modeName: mode.label,
                duration,
                startTime: currentTime,
                endTime
            });
            currentTime = endTime;
        }
    };

    // 1. Identify key modes
    const slowest     = activeModes[0];
    const nextSlowest = activeModes[1];
    const closestMode = activeModes[2] ?? nextSlowest;
    const fastest     = activeModes[activeModes.length - 1];

    const BOOKEND_DUR = 0.25;

    const startQueue: { mode: VehicleMode; dur: number }[] = [];
    const endQueue:   { mode: VehicleMode; dur: number }[] = [];

    // --- header ---
    if (slowest)     startQueue.push({ mode: slowest,     dur: Math.min(BOOKEND_DUR, remainingTime[slowest.id]) });
    if (nextSlowest) startQueue.push({ mode: nextSlowest, dur: Math.min(BOOKEND_DUR, remainingTime[nextSlowest.id]) });
    if (closestMode) {
        const half = Math.min(BOOKEND_DUR, remainingTime[closestMode.id] / 2);
        startQueue.push({ mode: closestMode, dur: half });
        endQueue.push(  { mode: closestMode, dur: half });
    }
    if (fastest) {
        const half = remainingTime[fastest.id] / 2;
        startQueue.push({ mode: fastest, dur: half });
        endQueue.push(  { mode: fastest, dur: half });
    }

    // --- footer ---
    if (nextSlowest) {
        const dur = Math.min(BOOKEND_DUR, Math.max(0, remainingTime[nextSlowest.id] - BOOKEND_DUR));
        if (dur > 0) endQueue.push({ mode: nextSlowest, dur });
    }
    if (slowest) {
        const dur = Math.min(BOOKEND_DUR, Math.max(0, remainingTime[slowest.id] - BOOKEND_DUR));
        if (dur > 0) endQueue.push({ mode: slowest, dur });
    }

    startQueue.forEach(q => { remainingTime[q.mode.id] -= q.dur; });
    endQueue.forEach(  q => { remainingTime[q.mode.id] -= q.dur; });

    // EXECUTE HEADER
    startQueue.forEach(q => pushSegment(q.mode, q.dur));

    // 3. BUILD MIRRORED MIDDLE
    // closestMode is fully consumed by header/footer, exclude it from middle
    const middleModes = activeModes.filter(m =>
        remainingTime[m.id] > 0.01 && m.id !== closestMode?.id
    );

    if (middleModes.length > 0) {
        const seqBase = middleModes.slice(0, Math.min(3, middleModes.length));
        const mirrorSeq: VehicleMode[] =
            seqBase.length > 1
                ? [...seqBase, ...seqBase.slice(0, -1).reverse()]
                : seqBase;

        const slotCount: Record<string, number> = {};
        mirrorSeq.forEach(m => { slotCount[m.id] = (slotCount[m.id] ?? 0) + 1; });

        const baseDurPerSlot: Record<string, number> = {};
        middleModes.forEach(m => {
            baseDurPerSlot[m.id] = remainingTime[m.id] / (slotCount[m.id] ?? 1);
        });

        const assigned: Record<string, number> = {};
        middleModes.forEach(m => { assigned[m.id] = 0; });

        const seen: Record<string, number> = {};
        middleModes.forEach(m => { seen[m.id] = 0; });

        mirrorSeq.forEach((mode, i) => {
            seen[mode.id] = (seen[mode.id] ?? 0) + 1;
            const isLastSlot = seen[mode.id] === slotCount[mode.id];
            let dur: number;

            if (isLastSlot) {
                dur = remainingTime[mode.id] - assigned[mode.id];
            } else {
                const posHash = hashString(`${mode.id}-mid-${i}-${dateStr}`);
                const jitter  = ((posHash % 50) - 25) / 100;
                dur = baseDurPerSlot[mode.id] * (1 + jitter);
                dur = Math.max(0.05, dur);
                assigned[mode.id] += dur;
            }

            pushSegment(mode, dur);
        });
    }

    // EXECUTE FOOTER
    endQueue.forEach(q => pushSegment(q.mode, q.dur));

    return segments;
}

const Timing: FC<TimingProps> = ({ calculated, vehicleConfig, index }) => {
    const { register, watch } = useFormContext<RoadList>();
    const startTime = watch(`itineraries.${index}.startTime`);

    const modes = useMemo(() => getModes(vehicleConfig), [vehicleConfig]);

    const modeData = useMemo(() => {
        if (!calculated) return {};
        const data: Record<string, number> = {};
        modes.forEach(mode => {
            // @ts-expect-error: dynamic keys
            const value = (calculated[mode.id] as number) || 0;
            if (value > 0) data[mode.id] = value;
        });
        return data;
    }, [calculated, modes]);

    const timeSegments = useMemo(() => {
        const date = calculated?.date ? new Date(calculated.date) : undefined;
        return distributeTimeSegments(modeData, modes, startTime || '09:00', date);
    }, [modeData, modes, startTime, calculated?.date]);

    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <IconButton size="xs" variant="outline">
                    <BiSolidTimer />
                </IconButton>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Таймінг маршруту</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <VStack align="stretch" gap={4}>
                                <Input
                                    type="time"
                                    {...register(`itineraries.${index}.startTime`)}
                                />

                                {timeSegments.length > 0 && (
                                    <Table.Root size="sm" variant="outline" w="auto">
                                        <Table.Body>
                                            {timeSegments.map((segment, idx) => (
                                                <Table.Row key={idx}>
                                                    <Table.Cell fontWeight="medium" px={2} py={1}>
                                                        {segment.startTime}
                                                    </Table.Cell>
                                                    <Table.Cell px={2} py={1}>
                                                        {segment.modeName}
                                                    </Table.Cell>
                                                    <Table.Cell px={2} py={1} textAlign="right">
                                                        {formatTime(segment.duration)}
                                                    </Table.Cell>
                                                </Table.Row>
                                            ))}
                                            <Table.Row>
                                                <Table.Cell fontWeight="medium" px={2} py={1}>
                                                    {timeSegments[timeSegments.length - 1]?.endTime}
                                                </Table.Cell>
                                                <Table.Cell px={2} py={1} color="gray.500">
                                                    СТОП
                                                </Table.Cell>
                                                <Table.Cell />
                                            </Table.Row>
                                        </Table.Body>
                                    </Table.Root>
                                )}
                            </VStack>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
};

export default Timing;