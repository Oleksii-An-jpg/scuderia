export function decimalToTimeString(decimal: number | null, verbose = false): string {
    if (decimal == null) return '';

    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);

    if (verbose) {
        return `${hours.toString().padStart(2, '0')} г. ${minutes.toString().padStart(2, '0')} хв.`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function timeStringToDecimal(timeString: string): number | null {
    if (!timeString) return null;

    const [hours, minutes] = timeString.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) return null;

    return hours + (minutes / 60);
}