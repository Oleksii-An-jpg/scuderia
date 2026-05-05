export interface Coordinate {
    lat: number;
    lon: number;
}

export interface Target {
    lat: number;
    lon: number;
    type: string;
    id: string;
    numTracks: number;
    spacing: number;
    bearing: number;

    // ✅ NEW (optional, clean extension)
    trackLength?: number;

    // ✅ NEW (for search mode — overrides everything)
    start?: Coordinate;
    end?: Coordinate;
}

export interface WaypointData {
    tag: string;
    lat: string;
    lon: string;
    bearing?: number;
    time?: number;
    distance?: number;
    isLeadin?: boolean;
    latNum?: number;
    lonNum?: number;
    isFirstGall?: boolean
    isFirstTurn?: boolean
}

// --- WGS-84 Geodesy Utilities (Vincenty's Formulae for mm precision) ---

const toRad = (d: number) => d * Math.PI / 180;
const toDeg = (r: number) => r * 180 / Math.PI;

const a = 6378137;
const b = 6356752.314245;
const f = 1 / 298.257223563;

export const inverse = (lat1: number, lon1: number, lat2: number, lon2: number): { distance: number, initialBearing: number } => {
    const L = toRad(lon2 - lon1);
    const U1 = Math.atan((1 - f) * Math.tan(toRad(lat1)));
    const U2 = Math.atan((1 - f) * Math.tan(toRad(lat2)));
    const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
    const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

    let lambda = L, lambdaP = 2 * Math.PI;
    let iterLimit = 100;
    let cosSqAlpha = 0, sinSigma = 0, cos2SigmaM = 0, cosSigma = 0, sigma = 0;

    while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0) {
        const sinLambda = Math.sin(lambda);
        const cosLambda = Math.cos(lambda);
        sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) +
            (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
        if (sinSigma === 0) return { distance: 0, initialBearing: 0 };
        cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
        sigma = Math.atan2(sinSigma, cosSigma);
        const sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
        cosSqAlpha = 1 - sinAlpha * sinAlpha;
        cos2SigmaM = cosSqAlpha === 0 ? 0 : cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
        const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
        lambdaP = lambda;
        lambda = L + (1 - C) * f * sinAlpha *
            (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    }

    const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    const deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
        B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    const s = b * A * (sigma - deltaSigma);

    const fwdAz = Math.atan2(cosU2 * Math.sin(lambda),
        cosU1 * sinU2 - sinU1 * cosU2 * Math.cos(lambda));

    return {
        distance: s,
        initialBearing: (toDeg(fwdAz) + 360) % 360
    };
};

export const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => inverse(lat1, lon1, lat2, lon2).distance;
export const bearing = (lat1: number, lon1: number, lat2: number, lon2: number) => inverse(lat1, lon1, lat2, lon2).initialBearing;

// Calculate destination point given distance and bearing
export const destination = (lat: number, lon: number, dist: number, brg: number): Coordinate => {
    const s = dist;
    const alpha1 = toRad(brg);
    const sinAlpha1 = Math.sin(alpha1);
    const cosAlpha1 = Math.cos(alpha1);

    const tanU1 = (1 - f) * Math.tan(toRad(lat));
    const cosU1 = 1 / Math.sqrt((1 + tanU1 * tanU1));
    const sinU1 = tanU1 * cosU1;
    const sigma1 = Math.atan2(tanU1, cosAlpha1);
    const sinAlpha = cosU1 * sinAlpha1;
    const cosSqAlpha = 1 - sinAlpha * sinAlpha;
    const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

    let sigma = s / (b * A);
    let sigmaP = 2 * Math.PI;
    let cos2SigmaM = 0;
    let sinSigma = 0;
    let cosSigma = 0;

    let iterLimit = 100;
    while (Math.abs(sigma - sigmaP) > 1e-12 && --iterLimit > 0) {
        cos2SigmaM = Math.cos(2 * sigma1 + sigma);
        sinSigma = Math.sin(sigma);
        cosSigma = Math.cos(sigma);
        const deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
            B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
        sigmaP = sigma;
        sigma = s / (b * A) + deltaSigma;
    }

    const tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1;
    const lat2 = Math.atan2(sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1,
        (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp));
    const lambda = Math.atan2(sinSigma * sinAlpha1, cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1);
    const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    const L = lambda - (1 - C) * f * sinAlpha *
        (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));

    return {
        lat: toDeg(lat2),
        lon: lon + toDeg(L)
    };
};

interface DegreesMinutes {
    degrees: number;
    minutes: number;
}

// --- Formatting ---

export const toDM = (deg: number): DegreesMinutes => {
    const d = Math.floor(Math.abs(deg));
    const m = (Math.abs(deg) - d) * 60;
    return { degrees: d, minutes: m };
};

export const formatLat = (lat: number): string => {
    const dm = toDM(lat);
    const dir = lat >= 0 ? 'N' : 'S';
    return `${dm.degrees.toString().padStart(2, '0')}:${dm.minutes.toFixed(4).padStart(7, '0')}${dir}`;
};

export const formatLon = (lon: number): string => {
    const dm = toDM(lon);
    const dir = lon >= 0 ? 'E' : 'W';
    return `${dm.degrees.toString().padStart(3, '0')}:${dm.minutes.toFixed(4).padStart(7, '0')}${dir}`;
};

export interface SearchArea {
    corners: Coordinate[]; // 4 points defining the quad
    altitude: number;
    speed: number;
    overlap: number;
    subOverlap: number; // The 60m overlap between sub-surveys
    flip?: boolean;
}

export const calculateTrackOffsets = (numTracks: number, spacing: number): number[] => {
    const tracks: number[] = [];
    const isOdd = numTracks % 2 === 1;

    if (isOdd) {
        tracks.push(0);
        for (let i = 1; i <= Math.floor(numTracks / 2); i++) {
            tracks.unshift(-i * spacing);
            tracks.push(i * spacing);
        }
    } else {
        const halfSpacing = spacing / 2;
        for (let i = 0; i < numTracks / 2; i++) {
            tracks.unshift(-(halfSpacing + i * spacing));
            tracks.push(halfSpacing + i * spacing);
        }
    }
    return tracks;
};

// Generate Excel-style column names: a, b, c, ..., z, aa, ab, ...
export const getColumnName = (n: number): string => {
    let result = '';
    while (n >= 0) {
        result = String.fromCharCode(97 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
    }
    return result;
};

export const formatWaypointLine = (waypoint: WaypointData, prevBearing?: number, isFirstLeadin?: boolean): string => {
    const { tag, lat, lon, bearing, time, distance } = waypoint;

    const tagWidth = 13;
    const depthWidth = 7;
    const altWidth = 6;
    const dmoWidth = 2;

    const tagPart = `:${tag}`.padEnd(tagWidth);
    const coordPart = `${lat} ${lon}`;

    const depthPart = isFirstLeadin ? "100.0".padStart(depthWidth) : '='.padStart(depthWidth);
    const altPart   = isFirstLeadin ? "18.0".padStart(altWidth)   : '='.padStart(altWidth);
    const dmoPart   = isFirstLeadin ? "T".padEnd(dmoWidth)        : '='.padEnd(dmoWidth);

    let coursePart: string;
    if (bearing !== undefined) {
        coursePart = `(${Math.round(bearing).toString().padStart(3, '0')})`;
    } else if (prevBearing !== undefined) {
        coursePart = `(${Math.round(prevBearing).toString().padStart(3, '0')})`;
    } else {
        coursePart = '='.padStart(5);
    }

    const gmo = '='.padStart(2);
    const rpm = '='.padStart(5);

    // Speed: 4.0k for leadin_a
    const speed = isFirstLeadin ? "4.0k".padStart(5) : '='.padStart(5);

    // SMO: S for leadin_a
    const smo = isFirstLeadin ? "S".padStart(2) : '='.padStart(2);

    // Duration: 60 for leadin_a
    const durPart = isFirstLeadin
        ? '60'.padStart(6)
        : (time !== undefined ? `(${time})`.padStart(6) : '='.padStart(6));

    // Distance: - for leadin_a
    const distPart = isFirstLeadin
        ? '-'.padStart(7)
        : (distance !== undefined ? `(${Math.round(distance)})`.padStart(7) : '='.padStart(7));

    // Flags: auto for leadin_a
    const flagsPart = isFirstLeadin ? '  auto' : waypoint.isFirstTurn ? '2GROff' : waypoint.isFirstGall ? '2GROn' : '';

    return `${tagPart} ${depthPart} ${altPart} ${dmoPart} ${coordPart} ${coursePart} ${gmo} ${rpm} ${speed} ${smo} ${durPart} ${distPart}${flagsPart}`;
};

const convertToDD = (match: RegExpMatchArray) => {
    const degrees = parseFloat(match[1]);
    const minutes = parseFloat(match[2]);
    const direction = match[3];

    let dd = degrees + minutes / 60;

    if (direction === 'S' || direction === 'W') {
        dd = dd * -1;
    }

    return dd;
};

// ─── MBR helpers (self-contained, no extra imports needed) ──────────────────

type Point = [number, number]; // [x, y] in metres (flat projection)

const R_EARTH = 6_378_137;

/** Project lat/lon to flat XY relative to a centroid origin */
function toXY(lat: number, lon: number, lat0: number, lon0: number): Point {
    const x = ((lon - lon0) * Math.PI / 180) * R_EARTH * Math.cos(lat0 * Math.PI / 180);
    const y = ((lat - lat0) * Math.PI / 180) * R_EARTH;
    return [x, y];
}

/** Back-project flat XY to lat/lon */
function fromXY(x: number, y: number, lat0: number, lon0: number): [number, number] {
    const lat = lat0 + (y / R_EARTH) * (180 / Math.PI);
    const lon = lon0 + (x / (R_EARTH * Math.cos(lat0 * Math.PI / 180))) * (180 / Math.PI);
    return [lat, lon];
}

function cross(O: Point, A: Point, B: Point): number {
    return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
}

/** Andrew's monotone chain convex hull */
function convexHull(pts: Point[]): Point[] {
    const sorted = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const lower: Point[] = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
            lower.pop();
        lower.push(p);
    }
    const upper: Point[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
            upper.pop();
        upper.push(p);
    }
    lower.pop();
    upper.pop();
    return [...lower, ...upper];
}

/** Rotating calipers — returns the 4 XY corners of the minimum-area bounding rectangle */
function minBoundingRectXY(hull: Point[]): [Point, Point, Point, Point] {
    const n = hull.length;
    let minArea = Infinity;
    let best: { ux: number; uy: number; vx: number; vy: number; minP: number; maxP: number; minQ: number; maxQ: number } | null = null;

    for (let i = 0; i < n; i++) {
        const A = hull[i], B = hull[(i + 1) % n];
        const ex = B[0] - A[0], ey = B[1] - A[1];
        const len = Math.hypot(ex, ey);
        const ux = ex / len, uy = ey / len;
        const vx = -uy,      vy =  ux;

        let minP = Infinity, maxP = -Infinity, minQ = Infinity, maxQ = -Infinity;
        for (const p of hull) {
            const proj = p[0] * ux + p[1] * uy;
            const perp = p[0] * vx + p[1] * vy;
            if (proj < minP) minP = proj;
            if (proj > maxP) maxP = proj;
            if (perp < minQ) minQ = perp;
            if (perp > maxQ) maxQ = perp;
        }

        const area = (maxP - minP) * (maxQ - minQ);
        if (area < minArea) {
            minArea = area;
            best = { ux, uy, vx, vy, minP, maxP, minQ, maxQ };
        }
    }

    if (!best) throw new Error('minBoundingRectXY: degenerate hull');
    const { ux, uy, vx, vy, minP, maxP, minQ, maxQ } = best;
    return [
        [minP * ux + minQ * vx, minP * uy + minQ * vy],
        [maxP * ux + minQ * vx, maxP * uy + minQ * vy],
        [maxP * ux + maxQ * vx, maxP * uy + maxQ * vy],
        [minP * ux + maxQ * vx, minP * uy + maxQ * vy],
    ];
}

/**
 * Given an array of {lat, lon} points, returns the 4 corners of the
 * minimum-area bounding rectangle as decimal-degree coordinates.
 */
export function computeMBR(points: { lat: number; lon: number }[]): { lat: number; lon: number }[] {
    if (points.length < 3) return points; // degenerate — nothing to rotate

    const lat0 = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lon0 = points.reduce((s, p) => s + p.lon, 0) / points.length;

    const xy = points.map(p => toXY(p.lat, p.lon, lat0, lon0));
    const hull = convexHull(xy);
    const rect = minBoundingRectXY(hull);

    return rect.map(pt => {
        const [lat, lon] = fromXY(pt[0], pt[1], lat0, lon0);
        return { lat, lon };
    });
}

// ─── Updated processCoordinates ──────────────────────────────────────────────

export interface ProcessCoordinatesResult {
    /** Original closed-loop lines, same format as before: "lat\tlon\tN" */
    raw: string[];
    /** MBR corner lines in the same format, closed loop, all with column = 15 */
    mbr: string[];
    /** Convenience: raw lines followed by a blank separator then mbr lines */
    combined: string[];
}

export const processCoordinates = (input: string): ProcessCoordinatesResult => {
    const coordRegex = /(\d+)°\s*(\d+\.?\d*)'([NSEW])/g;
    const matches = Array.from(input.matchAll(coordRegex));

    // ── build raw pairs (original logic, untouched) ──
    const rawPoints: { lat: number; lon: number }[] = [];
    const raw: string[] = [];

    for (let i = 0; i < matches.length; i += 2) {
        if (matches[i] && matches[i + 1]) {
            const lat = convertToDD(matches[i]);
            const lon = convertToDD(matches[i + 1]);
            rawPoints.push({ lat, lon });
            const thirdColumn = i === 0 ? 10 : 15;
            raw.push(`${lat.toFixed(7)}\t${lon.toFixed(7)}\t${thirdColumn}`);
        }
    }

    // Close the raw loop
    if (raw.length > 0) {
        const [firstLat, firstLon] = raw[0].split('\t');
        raw.push(`${firstLat}\t${firstLon}\t15`);
    }

    // ── build MBR lines ──
    const mbr: string[] = [];
    const ddmmComments: string[] = [];

    if (rawPoints.length >= 3) {
        const mbrCorners = computeMBR(rawPoints);

        mbrCorners.forEach((pt, i) => {
            // First MBR corner gets 10 to match the raw convention; rest get 15
            const thirdColumn = i === 0 ? 10 : 15;
            mbr.push(`${pt.lat.toFixed(7)}\t${pt.lon.toFixed(7)}\t${thirdColumn}`);
        });

        // Close the MBR loop
        if (mbr.length > 0) {
            const [firstLat, firstLon] = mbr[0].split('\t');
            mbr.push(`${firstLat}\t${firstLon}\t15`);
        }

        // ── DDmm comments: one line per MBR corner (excluding closing duplicate) ──
        for (const pt of mbrCorners) {
            const latDM = toDM(pt.lat);
            const lonDM = toDM(pt.lon);
            const latDir = pt.lat >= 0 ? 'N' : 'S';
            const lonDir = pt.lon >= 0 ? 'E' : 'W';
            const latStr = `${latDM.degrees}°${latDM.minutes.toFixed(4)}'${latDir}`;
            const lonStr = `${lonDM.degrees}°${lonDM.minutes.toFixed(4)}'${lonDir}`;
            ddmmComments.push(`# ${latStr} ${lonStr}`);
        }
    }

    // ── combined: raw + blank line + mbr + blank line + DDmm comments ──
    const combined = raw.length > 0 && mbr.length > 0
        ? [...raw, '', ...mbr, '', ...ddmmComments]
        : [...raw, ...mbr];

    return { raw, mbr, combined };
};
