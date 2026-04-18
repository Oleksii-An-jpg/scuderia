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
    const slowest = activeModes[0];
    const nextSlowest = activeModes[1];
    const fastest = activeModes[activeModes.length - 1];

    // 2. Start/End Queues
    const startQueue: { mode: VehicleMode, dur: number }[] = [];
    const endQueue: { mode: VehicleMode, dur: number }[] = [];

    if (slowest) startQueue.push({ mode: slowest, dur: Math.min(0.25, remainingTime[slowest.id]) });
    if (nextSlowest) startQueue.push({ mode: nextSlowest, dur: Math.min(0.25, remainingTime[nextSlowest.id]) });
    if (fastest) {
        const half = remainingTime[fastest.id] / 2;
        startQueue.push({ mode: fastest, dur: half });
        endQueue.push({ mode: fastest, dur: half });
    }
    if (nextSlowest) {
        const dur = Math.min(0.25, Math.max(0, remainingTime[nextSlowest.id] - 0.25));
        if (dur > 0) endQueue.push({ mode: nextSlowest, dur });
    }
    if (slowest) {
        const dur = Math.min(0.25, Math.max(0, remainingTime[slowest.id] - 0.25));
        if (dur > 0) endQueue.push({ mode: slowest, dur });
    }

    startQueue.forEach(q => remainingTime[q.mode.id] -= q.dur);
    endQueue.forEach(q => remainingTime[q.mode.id] -= q.dur);

    // EXECUTE START
    startQueue.forEach(q => pushSegment(q.mode, q.dur));

    // 3. GENERATE MIDDLE CHUNKS WITH JITTER
    const middlePool: { mode: VehicleMode, duration: number, hash: number }[] = [];

    activeModes.forEach(mode => {
        const timeLeft = remainingTime[mode.id];
        if (timeLeft <= 0.01) return;

        // Determine number of chunks (roughly every 20-40 mins)
        const numChunks = Math.max(1, Math.ceil(timeLeft / 0.5));
        let allocatedForMode = 0;

        for (let i = 0; i < numChunks; i++) {
            const chunkHash = hashString(`${mode.id}-${i}-${dateStr}`);
            let chunkDur: number;

            if (i === numChunks - 1) {
                // Last chunk takes the absolute remainder to stay precise
                chunkDur = timeLeft - allocatedForMode;
            } else {
                // Base duration + deterministic jitter (-30% to +30%)
                const baseDur = timeLeft / numChunks;
                const jitter = ((chunkHash % 60) - 30) / 100;
                chunkDur = baseDur * (1 + jitter);

                // Keep it within reasonable bounds (min 5 mins)
                chunkDur = Math.max(0.08, chunkDur);
                allocatedForMode += chunkDur;
            }

            middlePool.push({
                mode,
                duration: chunkDur,
                hash: chunkHash
            });
        }
    });

    // 4. DISTRIBUTE MIDDLE (Greedy & Persistent)
    while (middlePool.length > 0) {
        const lastModeId = segments[segments.length - 1]?.modeId;
        middlePool.sort((a, b) => a.hash - b.hash);

        let index = middlePool.findIndex(chunk => chunk.mode.id !== lastModeId);
        if (index === -1) index = 0;

        const [selected] = middlePool.splice(index, 1);
        pushSegment(selected.mode, selected.duration);
    }

    // 5. EXECUTE END
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