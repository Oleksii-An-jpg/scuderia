// --- Types ---
export interface Target {
    lat: number;
    lon: number;
    type: string;
    id: string;
    numTracks: number;
    spacing: number;
    bearing: number;
}

export interface SurveyOptions {
    speed: number;
    useBoxLeadins?: boolean;
    boxLeadinAngleThreshold?: number;
}

interface Coordinate {
    lat: number;
    lon: number;
}

interface DegreesMinutes {
    degrees: number;
    minutes: number;
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
}

// --- WGS-84 Geodesy Utilities (Vincenty's Formulae for mm precision) ---

const toRad = (d: number) => d * Math.PI / 180;
const toDeg = (r: number) => r * 180 / Math.PI;

const a = 6378137;
const b = 6356752.314245;
const f = 1 / 298.257223563;

// Calculate destination point given distance and bearing
const destination = (lat: number, lon: number, dist: number, brg: number): Coordinate => {
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

// Calculate distance and bearing between two points
const inverse = (lat1: number, lon1: number, lat2: number, lon2: number): { distance: number, initialBearing: number } => {
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

// Wrappers
const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => inverse(lat1, lon1, lat2, lon2).distance;
const bearing = (lat1: number, lon1: number, lat2: number, lon2: number) => inverse(lat1, lon1, lat2, lon2).initialBearing;


// --- Formatting ---

const toDM = (deg: number): DegreesMinutes => {
    const d = Math.floor(Math.abs(deg));
    const m = (Math.abs(deg) - d) * 60;
    return { degrees: d, minutes: m };
};

const formatLat = (lat: number): string => {
    const dm = toDM(lat);
    const dir = lat >= 0 ? 'N' : 'S';
    return `${dm.degrees.toString().padStart(2, '0')}:${dm.minutes.toFixed(4).padStart(7, '0')}${dir}`;
};

const formatLon = (lon: number): string => {
    const dm = toDM(lon);
    const dir = lon >= 0 ? 'E' : 'W';
    return `${dm.degrees.toString().padStart(3, '0')}:${dm.minutes.toFixed(4).padStart(7, '0')}${dir}`;
};

const formatWaypointLine = (waypoint: WaypointData, prevBearing?: number): string => {
    const { tag, lat, lon, bearing, time, distance } = waypoint;

    const tagWidth = 13;
    const depthWidth = 7;
    const altWidth = 6;
    const dmoWidth = 2;

    const tagPart = `:${tag}`.padEnd(tagWidth);
    const depthPart = '='.padStart(depthWidth);
    const altPart = '='.padStart(altWidth);
    const dmoPart = '='.padEnd(dmoWidth);
    const coordPart = `${lat} ${lon}`;

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
    const speed = '='.padStart(3);
    const smo = '='.padStart(2);

    const durPart = time !== undefined ? `(${time})`.padStart(6) : '='.padStart(6);
    const distPart = distance !== undefined ? `(${Math.round(distance)})`.padStart(7) : '='.padStart(7);

    return `${tagPart} ${depthPart} ${altPart} ${dmoPart} ${coordPart} ${coursePart} ${gmo} ${rpm} ${speed} ${smo} ${durPart} ${distPart}`;
};

// --- Pattern Logic ---

export const parseTargets = (input: string): Target[] => {
    const lines = input.trim().split('\n').filter(l => {
        const trimmed = l.trim();
        return trimmed && !trimmed.startsWith('#');
    });
    return lines.map(line => {
        const parts = line.split(/\s+/);
        return {
            lat: parseFloat(parts[0]),
            lon: parseFloat(parts[1]),
            type: parts[2],
            id: parts[3],
            numTracks: 3,
            spacing: 5,
            bearing: 0
        };
    });
};

const calculateTrackOffsets = (numTracks: number, spacing: number): number[] => {
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

export const generateSurveyRoute = (targets: Target[], options: SurveyOptions): { output: string[], waypoints: WaypointData[] } => {
    const { speed, useBoxLeadins = false, boxLeadinAngleThreshold = 45 } = options;
    const waypoints: WaypointData[] = [];
    let lastPoint: Coordinate | null = null;
    const trackLength = 200;
    const turnExtension = 60;

    targets.forEach((target, idx) => {
        // Generate Excel-style column names: a, b, c, ..., z, aa, ab, ...
        const getColumnName = (n: number): string => {
            let result = '';
            while (n >= 0) {
                result = String.fromCharCode(97 + (n % 26)) + result;
                n = Math.floor(n / 26) - 1;
            }
            return result;
        };
        const letter = getColumnName(idx);
        const tracks = calculateTrackOffsets(target.numTracks, target.spacing);
        const perpBearing = (target.bearing + 90) % 360;

        const trackSegments: { start: Coordinate, end: Coordinate, offset: number }[] = [];

        for (let i = 0; i < tracks.length; i++) {
            const offset = tracks[i];
            const centerPt = destination(target.lat, target.lon, offset, perpBearing);
            const isForward = i % 2 === 0;
            const heading = isForward ? target.bearing : (target.bearing + 180) % 360;
            const backHeading = (heading + 180) % 360;
            const tStart = destination(centerPt.lat, centerPt.lon, trackLength / 2, backHeading);
            const tEnd = destination(centerPt.lat, centerPt.lon, trackLength / 2, heading);
            trackSegments.push({ start: tStart, end: tEnd, offset });
        }

        for (let i = 0; i < trackSegments.length; i++) {
            const seg = trackSegments[i];

            if (i === 0) {
                const leadinTag = `leadin${letter}`;
                const trackBrg = bearing(seg.start.lat, seg.start.lon, seg.end.lat, seg.end.lon);

                if (idx === 0) {
                    waypoints.push({
                        tag: leadinTag,
                        lat: formatLat(seg.start.lat),
                        lon: formatLon(seg.start.lon),
                        latNum: seg.start.lat,
                        lonNum: seg.start.lon,
                        isLeadin: true
                    });
                } else {
                    const dist = distance(lastPoint!.lat, lastPoint!.lon, seg.start.lat, seg.start.lon);
                    const brg = bearing(lastPoint!.lat, lastPoint!.lon, seg.start.lat, seg.start.lon);

                    // Calculate angle difference between approach and track
                    let angleDiff = trackBrg - brg;
                    if (angleDiff > 180) angleDiff -= 360;
                    if (angleDiff < -180) angleDiff += 360;

                    // If box leadins enabled and approach angle is too sharp, add box pattern
                    if (useBoxLeadins && Math.abs(angleDiff) > boxLeadinAngleThreshold) {
                        console.log(321);
                        // Create a box approach similar to turn pattern
                        const approachDist = turnExtension;
                        const reverseBrg = (trackBrg + 180) % 360;

                        // Point 1: approach from behind the track
                        const p1 = destination(seg.start.lat, seg.start.lon, approachDist, reverseBrg);

                        // Point 2: offset perpendicular to track
                        const perpOffset = angleDiff > 0 ? -90 : 90;
                        const perpBrg = (trackBrg + perpOffset + 360) % 360;
                        const p2 = destination(p1.lat, p1.lon, approachDist, perpBrg);

                        // Point 3: move towards the approach line from current position
                        const d1 = distance(lastPoint!.lat, lastPoint!.lon, p2.lat, p2.lon);
                        const b1 = bearing(lastPoint!.lat, lastPoint!.lon, p2.lat, p2.lon);

                        waypoints.push({
                            tag: `${leadinTag}_1`,
                            lat: formatLat(p2.lat),
                            lon: formatLon(p2.lon),
                            latNum: p2.lat,
                            lonNum: p2.lon,
                            bearing: b1,
                            time: Math.round(d1 / speed),
                            distance: d1,
                            isLeadin: true
                        });

                        const d2 = distance(p2.lat, p2.lon, p1.lat, p1.lon);
                        const b2 = bearing(p2.lat, p2.lon, p1.lat, p1.lon);

                        waypoints.push({
                            tag: `${leadinTag}_2`,
                            lat: formatLat(p1.lat),
                            lon: formatLon(p1.lon),
                            latNum: p1.lat,
                            lonNum: p1.lon,
                            bearing: b2,
                            time: Math.round(d2 / speed),
                            distance: d2,
                            isLeadin: true
                        });

                        const d3 = distance(p1.lat, p1.lon, seg.start.lat, seg.start.lon);

                        waypoints.push({
                            tag: `${leadinTag}_3`,
                            lat: formatLat(seg.start.lat),
                            lon: formatLon(seg.start.lon),
                            latNum: seg.start.lat,
                            lonNum: seg.start.lon,
                            bearing: trackBrg,
                            time: Math.round(d3 / speed),
                            distance: d3,
                            isLeadin: true
                        });
                    } else {
                        // Straight approach - angle is acceptable
                        const time = Math.round(dist / speed);
                        waypoints.push({
                            tag: leadinTag,
                            lat: formatLat(seg.start.lat),
                            lon: formatLon(seg.start.lon),
                            latNum: seg.start.lat,
                            lonNum: seg.start.lon,
                            bearing: brg,
                            time,
                            distance: dist,
                            isLeadin: true
                        });
                    }
                }
            }

            const trackTag = `${letter}_${i + 1}`;
            const trackBrg = bearing(seg.start.lat, seg.start.lon, seg.end.lat, seg.end.lon);
            const trackDist = distance(seg.start.lat, seg.start.lon, seg.end.lat, seg.end.lon);
            const trackTime = Math.round(trackDist / speed);
            waypoints.push({
                tag: trackTag,
                lat: formatLat(seg.end.lat),
                lon: formatLon(seg.end.lon),
                latNum: seg.end.lat,
                lonNum: seg.end.lon,
                bearing: trackBrg,
                time: trackTime,
                distance: trackDist
            });

            if (i < trackSegments.length - 1) {
                const nextSeg = trackSegments[i + 1];
                const turnTagBase = `t${trackTag}`;
                const currentHdg = trackBrg;

                const isNextTrackRight = nextSeg.offset > seg.offset;
                const turnAwayBrg = isNextTrackRight
                    ? (currentHdg - 90 + 360) % 360
                    : (currentHdg + 90) % 360;
                const turnTowardsBrg = (turnAwayBrg + 180) % 360;

                const p1 = destination(seg.end.lat, seg.end.lon, turnExtension, turnAwayBrg);
                const d1 = distance(seg.end.lat, seg.end.lon, p1.lat, p1.lon);

                const p2 = destination(p1.lat, p1.lon, turnExtension, currentHdg);
                const d2 = distance(p1.lat, p1.lon, p2.lat, p2.lon);

                // Check if we turned in the same direction as where the next track is
                const bearingToNextTrack = bearing(seg.end.lat, seg.end.lon, nextSeg.start.lat, nextSeg.start.lon);
                let angleDiff = bearingToNextTrack - turnAwayBrg;
                if (angleDiff > 180) angleDiff -= 360;
                if (angleDiff < -180) angleDiff += 360;

                const turnedTowardsNext = Math.abs(angleDiff) < 90;
                const spacingDiff = Math.abs(nextSeg.offset - seg.offset);
                const crossDist = turnedTowardsNext
                    ? turnExtension - spacingDiff
                    : turnExtension + spacingDiff;
                const p3 = destination(p2.lat, p2.lon, crossDist, turnTowardsBrg);
                const d3 = distance(p2.lat, p2.lon, p3.lat, p3.lon);

                waypoints.push({
                    tag: `${turnTagBase}_1`,
                    lat: formatLat(p1.lat),
                    lon: formatLon(p1.lon),
                    latNum: p1.lat,
                    lonNum: p1.lon,
                    bearing: turnAwayBrg,
                    time: Math.round(d1 / speed),
                    distance: d1
                });

                waypoints.push({
                    tag: `${turnTagBase}_2`,
                    lat: formatLat(p2.lat),
                    lon: formatLon(p2.lon),
                    latNum: p2.lat,
                    lonNum: p2.lon,
                    bearing: currentHdg,
                    time: Math.round(d2 / speed),
                    distance: d2
                });

                waypoints.push({
                    tag: `${turnTagBase}_3`,
                    lat: formatLat(p3.lat),
                    lon: formatLon(p3.lon),
                    latNum: p3.lat,
                    lonNum: p3.lon,
                    bearing: turnTowardsBrg,
                    time: Math.round(d3 / speed),
                    distance: d3
                });

                const d4 = distance(p3.lat, p3.lon, nextSeg.start.lat, nextSeg.start.lon);
                const b4 = bearing(p3.lat, p3.lon, nextSeg.start.lat, nextSeg.start.lon);

                waypoints.push({
                    tag: `${turnTagBase}_4`,
                    lat: formatLat(nextSeg.start.lat),
                    lon: formatLon(nextSeg.start.lon),
                    latNum: nextSeg.start.lat,
                    lonNum: nextSeg.start.lon,
                    bearing: b4,
                    time: Math.round(d4 / speed),
                    distance: d4
                });

                lastPoint = nextSeg.start;
            } else {
                lastPoint = seg.end;
            }
        }
    });

    const output: string[] = [];
    output.push('#No:Tag       Depth    Alt DMo   Latitude    Longitude Course GMo  RPM Speed SMo   Dur   Dist  Flags');
    output.push('');

    let prevBearing: number | undefined;
    let currentPattern = '';

    waypoints.forEach((wp) => {
        if (wp.isLeadin) {
            const newPattern = wp.tag.replace(/leadin/, '').replace(/_\d+$/, '');
            if (currentPattern && newPattern !== currentPattern) {
                output.push('');
            }
            currentPattern = newPattern;
        }
        const line = formatWaypointLine(wp, prevBearing);
        output.push(line);
        if (wp.bearing !== undefined) {
            prevBearing = wp.bearing;
        }
    });

    return { output, waypoints };
};