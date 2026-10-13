// src/components/VehicleSummary/index.tsx

import { FC } from 'react';
import { Badge, HStack, Text, VStack } from '@chakra-ui/react';
import { VehicleConfig } from '@/types/vehicle';
import { CalculatedRoadList, EngineHours } from '@/types/roadList';

const formatNumber = (value: number) => value.toLocaleString('uk-UA', { maximumFractionDigits: 2 });

const formatUsage = (value?: EngineHours | number) =>
    typeof value === 'object'
        ? `л ${formatNumber(value.left)} · п ${formatNumber(value.right)} год.`
        : `${formatNumber(value ?? 0)} км`;

const SummaryRow: FC<{ label: string; fuel: number; usage: string }> = ({ label, fuel, usage }) => (
    <HStack justifyContent="space-between" gap={3} w="full" className="whitespace-nowrap">
        <Text color="fg.muted">{label}</Text>
        <Text fontVariantNumeric="tabular-nums">
            <Text as="span" fontWeight="semibold" color={fuel < 0 ? 'red.600' : undefined}>{formatNumber(fuel)} л</Text>
            <Text as="span" color="fg.muted"> · {usage}</Text>
        </Text>
    </HStack>
);

const VehicleSummary: FC<{ vehicle: VehicleConfig; roadLists: CalculatedRoadList[] }> = ({ vehicle, roadLists }) => {
    const last = roadLists[roadLists.length - 1];

    return (
        <VStack alignItems="stretch" gap={1} w="full" fontSize="xs" fontWeight="normal">
            <HStack justifyContent="space-between" gap={2}>
                <Text fontSize="sm" fontWeight="bold" truncate>{vehicle.name}</Text>
                <Badge size="sm" variant="subtle" colorPalette={vehicle.fuel === 'gasoline' ? 'green' : 'orange'}>
                    {vehicle.fuel === 'gasoline' ? 'бензин' : 'дизель'}
                </Badge>
            </HStack>
            <SummaryRow label="Залишок" fuel={Math.round(last?.cumulativeFuel ?? 0)} usage={formatUsage(last?.cumulativeHours)} />
            {last?.cumulativeHoursFromRecentMaintenance !== undefined ? (
                <SummaryRow
                    label="Після ТО"
                    fuel={Math.round(last.cumulativeFuelFromRecentMaintenance ?? 0)}
                    usage={formatUsage(last.cumulativeHoursFromRecentMaintenance)}
                />
            ) : null}
        </VStack>
    );
};

export default VehicleSummary;
