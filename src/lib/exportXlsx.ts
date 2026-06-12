import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CalculatedRoadList } from '@/types/roadList';
import { VehicleConfig, getModes, isBoat } from '@/types/vehicle';
import { decimalToTimeString } from '@/lib/timeUtils';

const DATE_FMT = new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' });

function fmtDate(d: Date) {
    return DATE_FMT.format(d);
}

function safeNum(v: number | null | undefined): number | '' {
    if (v == null || isNaN(v)) return '';
    return v;
}

function fmtHours(val: number, boat: boolean) {
    return boat ? decimalToTimeString(val) : String(Math.round(val));
}

function fmtEngineHours(val: number | { left: number; right: number } | null | undefined, boat: boolean): string {
    if (val == null) return '';
    if (typeof val === 'object') return `л:${decimalToTimeString(val.left)} п:${decimalToTimeString(val.right)}`;
    if (isNaN(val)) return '';
    return fmtHours(val, boat);
}

function buildSheet(roadLists: CalculatedRoadList[], vehicleConfig: VehicleConfig): XLSX.WorkSheet {
    const boat = isBoat(vehicleConfig);
    const modes = getModes(vehicleConfig);
    const unitLabel = boat ? 'год.' : 'км';

    // Sort newest first
    const sorted = [...roadLists].sort((a, b) => b.start.getTime() - a.start.getTime());

    const rows: (string | number)[][] = [];

    for (const rl of sorted) {
        // Road list header row
        const periodLabel = `${fmtDate(rl.start)} — ${fmtDate(rl.end)}`;
        const rlHeader = rl.roadListID
            ? `Дорожній лист №${rl.roadListID}  |  ${periodLabel}`
            : `Дорожній лист  |  ${periodLabel}`;

        rows.push([rlHeader]);

        // Start-of-period info row
        rows.push([
            `Паливо на початок: ${Math.round(rl.startFuel)} л.`,
            '',
            `${boat ? 'Мотогодини' : 'Одометр'} на початок: ${fmtEngineHours(rl.startHours, boat)}`,
        ]);

        // Column header row
        const colHeaders = [
            'Дата',
            'БР',
            ...modes.map(m => m.label),
            `Відпрацьовано (${unitLabel})`,
            'Витрата пального (л)',
            'Отримано пального (л)',
            'Залишок пального (л)',
            boat ? 'Напрацювання (год:хв)' : 'Одометр після (км)',
            'Коментар',
        ];
        rows.push(colHeaders);

        // Itinerary rows
        for (const it of rl.itineraries) {
            const modeValues = modes.map(m => {
                // @ts-expect-error: dynamic keys
                const v = it[m.id];
                return safeNum(v as number | null | undefined);
            });

            const rowHours = safeNum(it.rowHours);
            rows.push([
                fmtDate(it.date),
                safeNum(it.br),
                ...modeValues,
                rowHours !== '' ? (boat ? decimalToTimeString(rowHours) : Math.round(rowHours)) : '',
                safeNum(it.rowConsumed) !== '' ? Math.round(safeNum(it.rowConsumed) as number) : '',
                safeNum(it.fuel),
                safeNum(it.cumulativeFuel) !== '' ? Math.round(safeNum(it.cumulativeFuel) as number) : '',
                fmtEngineHours(it.cumulativeHours, boat),
                it.comment ?? '',
            ]);
        }

        // Totals row
        const totalHours = safeNum(rl.hours);
        const modeTotals = modes.map(m =>
            rl.itineraries.reduce((sum, it) => {
                // @ts-expect-error: dynamic keys
                const v = it[m.id];
                return sum + (typeof v === 'number' && !isNaN(v) ? v : 0);
            }, 0) || ''
        );
        rows.push([
            'РАЗОМ',
            '',
            ...modeTotals,
            totalHours !== '' ? (boat ? decimalToTimeString(totalHours) : Math.round(totalHours)) : '',
            safeNum(rl.fuel) !== '' ? Math.round(safeNum(rl.fuel) as number) : '',
            safeNum(rl.cumulativeReceivedFuel) !== '' ? Math.round(safeNum(rl.cumulativeReceivedFuel) as number) : '',
            safeNum(rl.cumulativeFuel) !== '' ? Math.round(safeNum(rl.cumulativeFuel) as number) : '',
            fmtEngineHours(rl.cumulativeHours, boat),
            '',
        ]);

        // Blank separator
        rows.push([]);
    }

    return XLSX.utils.aoa_to_sheet(rows);
}

export function exportAllVehiclesToXlsx(
    calculatedCache: Record<string, CalculatedRoadList[]>,
    vehicleConfigs: VehicleConfig[],
) {
    const wb = XLSX.utils.book_new();

    for (const vehicleConfig of vehicleConfigs) {
        const roadLists = calculatedCache[vehicleConfig.id];
        if (!roadLists || roadLists.length === 0) continue;

        const ws = buildSheet(roadLists, vehicleConfig);
        // Sheet name max 31 chars, strip illegal chars
        const sheetName = vehicleConfig.name.slice(0, 31).replace(/[\\/:*?[\]]/g, '_');
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'дорожні-листи.xlsx');
}
