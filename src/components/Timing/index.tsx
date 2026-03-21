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

// Convert hours to HH:MM format
function formatTime(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Add hours to a time string
function addHours(timeStr: string, hours: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + Math.round(hours * 60);
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Add minutes to a time string
function addMinutes(timeStr: string, minutes: number): string {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Simple hash function to generate pseudo-random number from date
function hashDate(date: Date): number {
    const dateStr = date.toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

// Generate a deterministic shift in minutes based on segment index and date
function getTimeShift(date: Date, segmentIndex: number): number {
    const hash = hashDate(date);
    const seed = hash + segmentIndex;
    // Generate shift between -3 and +3 minutes
    return ((seed % 7) - 3);
}

// Distribute time segments in an interleaved pattern without consecutive repeats
function distributeTimeSegments(
    modeData: Record<string, number>,
    modes: VehicleMode[],
    startTime: string,
    itineraryDate?: Date
): TimeSegment[] {
    // Sort modes by order (slowest to fastest)
    const sortedModes = [...modes].sort((a, b) => a.order - b.order);

    // Filter only modes that have time assigned
    const activeModes = sortedModes.filter(mode => (modeData[mode.id] || 0) > 0);

    if (activeModes.length === 0) return [];

    const segments: TimeSegment[] = [];
    let currentTime = startTime;

    // If only one mode, just use it
    if (activeModes.length === 1) {
        const mode = activeModes[0];
        const duration = modeData[mode.id];
        segments.push({
            modeId: mode.id,
            modeName: mode.label,
            duration,
            startTime: currentTime,
            endTime: addHours(currentTime, duration)
        });
        return segments;
    }

    // Determine bias direction: even date = start slow, odd date = start fast
    const dateHash = itineraryDate ? hashDate(itineraryDate) : 0;
    const biasToStart = dateHash % 2 === 0;

    // Create a pool of remaining time for each mode
    const remainingTime: Record<string, number> = {};
    activeModes.forEach(mode => {
        remainingTime[mode.id] = modeData[mode.id] || 0;
    });

    // Determine number of total segments (4-8 depending on modes and time)
    const targetSegments = Math.min(10, Math.max(4, activeModes.length * 2));

    // Order modes based on bias
    const modeOrder = biasToStart ? [...activeModes] : [...activeModes].reverse();

    let lastModeId: string | null = null;

    for (let i = 0; i < targetSegments; i++) {
        // Find modes that: 1) have time remaining, 2) aren't the last one used
        const availableModes = modeOrder.filter(m =>
            remainingTime[m.id] > 0.01 && m.id !== lastModeId
        );

        if (availableModes.length === 0) {
            // If only one mode left (or all done), use it or break
            const anyAvailable = modeOrder.find(m => remainingTime[m.id] > 0.01);
            if (!anyAvailable) break;
            availableModes.push(anyAvailable);
        }

        // Select mode based on progress through the journey
        const progress = i / targetSegments;
        let selectedMode: typeof activeModes[0];

        if (biasToStart) {
            // Start with slower modes, progress to faster
            const index = Math.floor(progress * availableModes.length);
            selectedMode = availableModes[Math.min(index, availableModes.length - 1)];
        } else {
            // Start with faster modes, progress to slower
            const index = Math.floor((1 - progress) * availableModes.length);
            selectedMode = availableModes[Math.min(index, availableModes.length - 1)];
        }

        // Determine segment duration with variation
        const seed = dateHash + i * 7;
        const portionFactor = 0.15 + ((seed % 35) / 100); // 0.15 to 0.5 of remaining time
        let segmentDuration = Math.min(
            remainingTime[selectedMode.id] * portionFactor,
            remainingTime[selectedMode.id]
        );

        // If this is likely the last segment for this mode, use remaining time
        const segmentsLeft = targetSegments - i;
        const modesWithTimeLeft = Object.values(remainingTime).filter(t => t > 0.01).length;
        if (segmentsLeft <= modesWithTimeLeft) {
            segmentDuration = remainingTime[selectedMode.id];
        }

        // Apply time shift only to segments after the first one
        const adjustedStartTime = (itineraryDate && segments.length > 0)
            ? addMinutes(currentTime, getTimeShift(itineraryDate, segments.length))
            : currentTime;

        const endTime = addHours(adjustedStartTime, segmentDuration);

        segments.push({
            modeId: selectedMode.id,
            modeName: selectedMode.label,
            duration: segmentDuration,
            startTime: adjustedStartTime,
            endTime: endTime
        });

        remainingTime[selectedMode.id] -= segmentDuration;
        lastModeId = selectedMode.id;
        currentTime = endTime;
    }

    return segments;
}

const Timing: FC<TimingProps> = ({ calculated, vehicleConfig, index }) => {
    const { register, watch } = useFormContext<RoadList>();
    const startTime = watch(`itineraries.${index}.startTime`);

    const modes = getModes(vehicleConfig);

    const modeData = useMemo(() => {
        if (!calculated) return {};
        const data: Record<string, number> = {};
        modes.forEach(mode => {
            // @ts-expect-error: dynamic keys
            const value = (calculated[mode.id] as number) || 0;
            if (value > 0) {
                data[mode.id] = value;
            }
        });
        return data;
    }, [calculated, modes]);

    const timeSegments = useMemo(() => {
        const date = calculated?.date ? new Date(calculated.date) : undefined;
        return distributeTimeSegments(modeData, modes, startTime || '09:00', date);
    }, [modeData, modes, startTime, calculated?.date]);

    return <Dialog.Root>
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
                                <>
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
                                                <Table.Cell px={2} py={1}>
                                                    СТОП
                                                </Table.Cell>
                                                <Table.Cell px={2} py={1}>
                                                </Table.Cell>
                                            </Table.Row>
                                        </Table.Body>
                                    </Table.Root>
                                </>
                            )}
                        </VStack>
                    </Dialog.Body>
                </Dialog.Content>
            </Dialog.Positioner>
        </Portal>
    </Dialog.Root>
}

export default Timing;